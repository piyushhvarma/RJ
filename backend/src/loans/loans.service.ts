import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { IdGeneratorService } from '../common/services/id-generator.service.js';
import { AuditService } from '../audit/audit.service.js';
import { InterestService } from '../interest/interest.service.js';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { CreateLoanDto } from './dto/create-loan.dto.js';
import { DisburseLoanDto } from './dto/disburse-loan.dto.js';
import { ListLoansDto } from './dto/list-loans.dto.js';
import { TopUpLoanDto, TopUpMode } from './dto/topup-loan.dto.js';

@Injectable()
export class LoansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ids: IdGeneratorService,
    private readonly audit: AuditService,
    private readonly interestService: InterestService,
  ) {}

  async create(dto: CreateLoanDto, actor: AuthenticatedUser) {
    const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
    if (!customer) throw new NotFoundException('Customer not found');

    return this.prisma.$transaction(async (tx) => {
      const loanCode = await this.ids.next('GL', tx as any);

      const loan = await tx.loan.create({
        data: {
          loanCode,
          customerId: dto.customerId,
          schemeId: dto.schemeId,
          principalAmount: dto.principalAmount,
          status: 'DRAFT',
          createdById: actor.id,
        },
      });

      await this.audit.log(
        {
          entityType: 'Loan',
          entityId: loan.id,
          action: 'LOAN_CREATED',
          userId: actor.id,
          roleAtTime: actor.role,
          newValue: { loanCode, customerId: dto.customerId, status: 'DRAFT' },
          result: 'SUCCESS',
        },
        tx,
      );

      return loan;
    });
  }

  async findById(id: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { id },
      include: {
        customer: true,
        jewelleryItems: { include: { photos: true } },
        appraisals: true,
        payments: true,
        ledgerEntries: { orderBy: { createdAt: 'asc' } },
        packet: { include: { storageLocation: true } },
        documents: true,
      },
    });
    if (!loan) throw new NotFoundException('Loan not found');
    return loan;
  }

  /**
   * Moves a DRAFT/APPROVED loan to ACTIVE and writes the disbursement
   * ledger entry. Mirrors the §112 activation acceptance criteria: a loan
   * cannot go active without collateral and a completed appraisal on file.
   * Manager+ only — enforced at the controller via @Roles.
   */
  async disburse(id: string, dto: DisburseLoanDto, actor: AuthenticatedUser) {
    const loan = await this.prisma.loan.findUnique({
      where: { id },
      include: { jewelleryItems: true, appraisals: true },
    });
    if (!loan) throw new NotFoundException('Loan not found');

    if (loan.status !== 'DRAFT' && loan.status !== 'APPROVED') {
      throw new BadRequestException(
        `Loan cannot be disbursed from status ${loan.status}`,
      );
    }
    if (loan.jewelleryItems.length === 0) {
      // BR-001: every active loan must have at least one active collateral item.
      throw new BadRequestException('Cannot disburse a loan with no jewellery collateral');
    }
    const appraisalComplete = loan.appraisals.some(
      (a) => a.status === 'MANAGER_APPROVED' || a.status === 'LOCKED',
    );
    if (!appraisalComplete) {
      throw new BadRequestException('Cannot disburse a loan without a completed appraisal');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.loan.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          principalAmount: dto.principalAmount,
          interestRate: dto.interestRate,
          interestType: dto.interestType,
          processingCharges: dto.processingCharges ?? 0,
          sanctionedDate: new Date(),
          maturityDate: new Date(dto.maturityDate),
          approvedById: actor.id,
        },
      });

      await tx.ledgerEntry.create({
        data: {
          loanId: id,
          type: 'DISBURSEMENT',
          amount: dto.principalAmount,
          balanceAfter: dto.principalAmount,
          createdById: actor.id,
        },
      });

      await this.audit.log(
        {
          entityType: 'Loan',
          entityId: id,
          action: 'LOAN_DISBURSED',
          userId: actor.id,
          roleAtTime: actor.role,
          oldValue: { status: loan.status },
          newValue: { status: 'ACTIVE', principalAmount: dto.principalAmount },
          result: 'SUCCESS',
        },
        tx,
      );

      return updated;
    });
  }

  async findAll(dto: ListLoansDto) {
    const page = dto.page && dto.page > 0 ? Number(dto.page) : 1;
    const limit = dto.limit && dto.limit > 0 ? Math.min(Number(dto.limit), 100) : 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (dto.status) {
      where.status = dto.status;
    }
    if (dto.q) {
      const q = dto.q.trim();
      where.OR = [
        { loanCode: { contains: q, mode: 'insensitive' } },
        { customer: { fullName: { contains: q, mode: 'insensitive' } } },
        { customer: { mobile: { contains: q } } },
        { customer: { customerCode: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const orderBy: any = {};
    const sortField = dto.sortBy === 'principalAmount' ? 'principalAmount' : 'createdAt';
    const sortOrder = dto.sortOrder === 'asc' ? 'asc' : 'desc';
    orderBy[sortField] = sortOrder;

    const [total, items] = await Promise.all([
      this.prisma.loan.count({ where }),
      this.prisma.loan.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          loanCode: true,
          status: true,
          principalAmount: true,
          interestRate: true,
          interestType: true,
          sanctionedDate: true,
          maturityDate: true,
          createdAt: true,
          customer: {
            select: {
              id: true,
              fullName: true,
              customerCode: true,
              mobile: true,
              kycStatus: true,
            },
          },
          _count: {
            select: {
              jewelleryItems: true,
              payments: true,
            },
          },
          packet: {
            select: {
              id: true,
              packetCode: true,
              status: true,
            },
          },
        },
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Processes a Top-Up or Loan Renewal at the counter.
   * Supports:
   * 1. RENEW_WITH_INTEREST_DEDUCTED:
   *    - Deducts accrued interest from top-up proceeds
   *    - Resets loan date (sanctionedDate) to today
   *    - Sets principal to previous principal + topupAmount
   *    - Records interest payment and ledger entries
   * 2. DIRECT_TOPUP:
   *    - Hands over full top-up cash without deducting accrued interest
   *    - Preserves original sanctionedDate
   *    - Sets principal to previous principal + topupAmount
   */
  async topupOrRenew(id: string, dto: TopUpLoanDto, actor: AuthenticatedUser) {
    const loan = await this.prisma.loan.findUnique({
      where: { id },
      include: {
        customer: true,
        scheme: true,
        jewelleryItems: true,
        ledgerEntries: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!loan) throw new NotFoundException('Loan not found');
    if (!['ACTIVE', 'OVERDUE', 'NOTICE'].includes(loan.status)) {
      throw new BadRequestException(`Cannot top up or renew a loan with status ${loan.status}`);
    }

    // Reconstruct current principal from ledger
    const currentPrincipal = loan.ledgerEntries.reduce((balance, entry) => {
      if (entry.type === 'DISBURSEMENT') return balance + entry.amount;
      if (entry.type === 'PRINCIPAL_PAID') return balance - entry.amount;
      if (entry.type === 'REVERSAL') return balance - entry.amount;
      return balance;
    }, 0);

    const newPrincipal = currentPrincipal + dto.topupAmount;
    const isRenew = dto.mode === TopUpMode.RENEW_WITH_INTEREST_DEDUCTED;
    const interestDeducted = dto.interestDeducted ?? 0;
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      // 1. Store customer photo or signature if provided and not already present
      if (dto.customerPhotoUrl && (!loan.customer.photoUrl || loan.customer.photoUrl.length < 50)) {
        await tx.customer.update({
          where: { id: loan.customerId },
          data: { photoUrl: dto.customerPhotoUrl },
        });
      }
      if (dto.customerSignatureUrl && (!loan.customer.signatureUrl || loan.customer.signatureUrl.length < 50)) {
        await tx.customer.update({
          where: { id: loan.customerId },
          data: { signatureUrl: dto.customerSignatureUrl },
        });
      }

      let paymentRecord: any = null;

      // 2. If RENEW: Settle accrued interest via Payment record and ledger entries
      if (isRenew && interestDeducted > 0) {
        const paymentCode = await this.ids.next('PAY', tx as any);
        paymentRecord = await tx.payment.create({
          data: {
            paymentCode,
            loanId: id,
            amount: interestDeducted,
            mode: dto.paymentMode ?? 'CASH',
            principalComponent: 0,
            interestComponent: interestDeducted,
            penaltyComponent: 0,
            otherCharges: 0,
            cashierId: actor.id,
            receiptNumber: paymentCode,
            notes: `Renewal interest settlement (deducted from top-up of ₹${dto.topupAmount}). ${dto.notes ?? ''}`.trim(),
          },
        });

        await tx.ledgerEntry.create({
          data: {
            loanId: id,
            type: 'PAYMENT',
            amount: interestDeducted,
            balanceAfter: currentPrincipal,
            relatedPaymentId: paymentRecord.id,
            createdById: actor.id,
            reason: 'Renewal interest settled from top-up proceeds',
          },
        });

        await tx.ledgerEntry.create({
          data: {
            loanId: id,
            type: 'INTEREST_PAID',
            amount: interestDeducted,
            balanceAfter: currentPrincipal,
            relatedPaymentId: paymentRecord.id,
            createdById: actor.id,
            reason: 'Accrued interest cleared for renewal',
          },
        });
      }

      // 3. Disbursement ledger entry for Top-Up
      await tx.ledgerEntry.create({
        data: {
          loanId: id,
          type: 'DISBURSEMENT',
          amount: dto.topupAmount,
          balanceAfter: newPrincipal,
          createdById: actor.id,
          reason: isRenew
            ? `Renewal Top-Up (+₹${dto.topupAmount}, Net Disbursed: ₹${dto.netDisbursed})`
            : `Direct Top-Up (+₹${dto.topupAmount}, Full Cash Disbursed: ₹${dto.netDisbursed})`,
        },
      });

      // 4. Update Loan
      const tenureMonths = dto.tenureMonths ?? 12;
      const newMaturity = new Date(now);
      newMaturity.setMonth(newMaturity.getMonth() + tenureMonths);

      const updateData: any = {
        principalAmount: newPrincipal,
      };

      if (isRenew) {
        updateData.sanctionedDate = now;
        updateData.maturityDate = newMaturity;
        updateData.status = 'ACTIVE';
      }

      const updatedLoan = await tx.loan.update({
        where: { id },
        data: updateData,
        include: {
          customer: true,
          jewelleryItems: true,
          payments: { orderBy: { paymentDate: 'desc' }, take: 5 },
          ledgerEntries: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
      });

      // 5. Generate Renewal Document Record
      const docCode = await this.ids.next('DOC', tx as any);
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const verificationCode = `RNW-${randomSuffix}`;

      const doc = await tx.document.create({
        data: {
          documentCode: docCode,
          loanId: id,
          type: 'RENEWAL',
          status: 'GENERATED',
          verificationCode,
        },
      });

      await tx.documentVersion.create({
        data: {
          documentId: doc.id,
          versionNumber: 1,
          fileUrl: `/documents/renewal-receipt/${id}/pdf`,
          reason: isRenew ? 'Renewal with Top-Up Agreement' : 'Direct Top-Up Addendum',
          createdById: actor.id,
        },
      });

      // 6. Audit Log
      await this.audit.log(
        {
          entityType: 'Loan',
          entityId: id,
          action: isRenew ? 'LOAN_RENEWED' : 'LOAN_TOPPED_UP',
          userId: actor.id,
          roleAtTime: actor.role,
          oldValue: {
            principalAmount: currentPrincipal,
            sanctionedDate: loan.sanctionedDate,
            status: loan.status,
          },
          newValue: {
            principalAmount: newPrincipal,
            topupAmount: dto.topupAmount,
            interestDeducted,
            netDisbursed: dto.netDisbursed,
            sanctionedDate: updatedLoan.sanctionedDate,
            mode: dto.mode,
          },
          reason: dto.notes ?? (isRenew ? 'Renewal with interest settlement' : 'Direct principal top-up'),
          result: 'SUCCESS',
        },
        tx,
      );

      return {
        loan: updatedLoan,
        documentId: doc.id,
        paymentId: paymentRecord?.id,
        summary: {
          mode: dto.mode,
          previousPrincipal: currentPrincipal,
          topupAmount: dto.topupAmount,
          interestDeducted,
          netDisbursed: dto.netDisbursed,
          newPrincipal,
          sanctionedDate: updatedLoan.sanctionedDate,
          customerPhotoUrl: dto.customerPhotoUrl,
          customerSignatureUrl: dto.customerSignatureUrl,
        },
      };
    });
  }
}

