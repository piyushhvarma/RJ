import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { IdGeneratorService } from '../common/services/id-generator.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { ReceivePaymentDto } from './dto/receive-payment.dto.js';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ids: IdGeneratorService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Current principal outstanding, derived from the append-only ledger
   * rather than a mutable "balance" column (§4.2/§25) — disbursements add,
   * PRINCIPAL_PAID entries subtract.
   *
   * NOTE: this does not yet account for accrued interest (§24's interest
   * engine is a separate, dedicated piece of work — not built in this
   * pass). Interest/penalty components on a payment are trusted as given
   * by the caller for now.
   */
  async outstandingPrincipal(loanId: string): Promise<number> {
    const entries = await this.prisma.ledgerEntry.findMany({ where: { loanId } });
    return entries.reduce((balance, entry) => {
      if (entry.type === 'DISBURSEMENT') return balance + entry.amount;
      if (entry.type === 'PRINCIPAL_PAID') return balance - entry.amount;
      if (entry.type === 'REVERSAL') return balance - entry.amount;
      return balance;
    }, 0);
  }

  async receive(dto: ReceivePaymentDto, actor: AuthenticatedUser) {
    const loan = await this.prisma.loan.findUnique({ where: { id: dto.loanId } });
    if (!loan) throw new NotFoundException('Loan not found');
    if (!['ACTIVE', 'OVERDUE', 'NOTICE'].includes(loan.status)) {
      throw new BadRequestException(`Cannot receive payment for a loan with status ${loan.status}`);
    }

    const principalComponent = dto.principalComponent ?? 0;
    const interestComponent = dto.interestComponent ?? 0;
    const penaltyComponent = dto.penaltyComponent ?? 0;
    const otherCharges = dto.otherCharges ?? 0;
    const allocated = principalComponent + interestComponent + penaltyComponent + otherCharges;

    if (Math.round(allocated * 100) !== Math.round(dto.amount * 100)) {
      throw new BadRequestException(
        'Payment components must sum to the total amount (allocation must be explicit and displayed, §28)',
      );
    }

    const currentPrincipal = await this.outstandingPrincipal(dto.loanId);
    if (principalComponent > currentPrincipal) {
      throw new BadRequestException(
        `Principal component (${principalComponent}) exceeds outstanding principal (${currentPrincipal})`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const paymentCode = await this.ids.next('PAY', tx as any);

      const payment = await tx.payment.create({
        data: {
          paymentCode,
          loanId: dto.loanId,
          amount: dto.amount,
          mode: dto.mode,
          principalComponent,
          interestComponent,
          penaltyComponent,
          otherCharges,
          cashierId: actor.id,
          receiptNumber: paymentCode,
          transactionRef: dto.transactionRef,
          notes: dto.notes,
        },
      });

      const newPrincipal = currentPrincipal - principalComponent;

      await tx.ledgerEntry.create({
        data: {
          loanId: dto.loanId,
          type: 'PAYMENT',
          amount: dto.amount,
          balanceAfter: newPrincipal,
          relatedPaymentId: payment.id,
          createdById: actor.id,
        },
      });

      if (principalComponent > 0) {
        await tx.ledgerEntry.create({
          data: {
            loanId: dto.loanId,
            type: 'PRINCIPAL_PAID',
            amount: principalComponent,
            balanceAfter: newPrincipal,
            relatedPaymentId: payment.id,
            createdById: actor.id,
          },
        });
      }
      if (interestComponent > 0) {
        await tx.ledgerEntry.create({
          data: {
            loanId: dto.loanId,
            type: 'INTEREST_PAID',
            amount: interestComponent,
            balanceAfter: newPrincipal,
            relatedPaymentId: payment.id,
            createdById: actor.id,
          },
        });
      }
      if (penaltyComponent > 0) {
        await tx.ledgerEntry.create({
          data: {
            loanId: dto.loanId,
            type: 'PENALTY_PAID',
            amount: penaltyComponent,
            balanceAfter: newPrincipal,
            relatedPaymentId: payment.id,
            createdById: actor.id,
          },
        });
      }

      await this.audit.log(
        {
          entityType: 'Payment',
          entityId: payment.id,
          action: 'PAYMENT_RECEIVED',
          userId: actor.id,
          roleAtTime: actor.role,
          newValue: { paymentCode, amount: dto.amount, principalComponent, interestComponent, penaltyComponent },
          result: 'SUCCESS',
        },
        tx,
      );

      return payment;
    });
  }

  async findByLoan(loanId: string) {
    return this.prisma.payment.findMany({ where: { loanId }, orderBy: { paymentDate: 'desc' } });
  }
}
