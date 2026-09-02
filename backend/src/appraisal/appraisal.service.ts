import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { CreateAppraisalDto, ApproveAppraisalDto } from './dto/appraisal.dto.js';

@Injectable()
export class AppraisalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateAppraisalDto, actor: AuthenticatedUser) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: dto.loanId },
      include: { jewelleryItems: true },
    });
    if (!loan) throw new NotFoundException('Loan not found');
    if (loan.jewelleryItems.length === 0) {
      throw new BadRequestException('Cannot start an appraisal before jewellery is recorded');
    }

    return this.prisma.appraisal.create({
      data: {
        loanId: dto.loanId,
        appraiserId: actor.id,
        status: 'DRAFT',
        notes: dto.notes,
        goldRateSource: dto.goldRateSource,
        goldRateValue: dto.goldRateValue,
        goldRateAt: dto.goldRateValue ? new Date() : undefined,
      },
    });
  }

  /** Appraiser confirms their own draft appraisal is complete (§19). */
  async confirm(appraisalId: string, actor: AuthenticatedUser) {
    const appraisal = await this.prisma.appraisal.findUnique({ where: { id: appraisalId } });
    if (!appraisal) throw new NotFoundException('Appraisal not found');
    if (appraisal.status !== 'DRAFT') {
      throw new BadRequestException(`Appraisal cannot be confirmed from status ${appraisal.status}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.appraisal.update({
        where: { id: appraisalId },
        data: { status: 'APPRAISER_CONFIRMED' },
      });

      await tx.loan.update({
        where: { id: appraisal.loanId },
        data: { status: 'APPRAISED' },
      });

      await this.audit.log(
        {
          entityType: 'Appraisal',
          entityId: appraisalId,
          action: 'APPRAISAL_CONFIRMED',
          userId: actor.id,
          roleAtTime: actor.role,
          result: 'SUCCESS',
        },
        tx,
      );

      return updated;
    });
  }

  /**
   * Manager approval finalizes and locks the appraisal in one step — the
   * PRD treats "finalized" and "locked" as the same event (§19/§21).
   * Any correction after this point must go through an authorized
   * amendment rather than editing jewellery items directly.
   */
  async approve(appraisalId: string, dto: ApproveAppraisalDto, actor: AuthenticatedUser) {
    const appraisal = await this.prisma.appraisal.findUnique({ where: { id: appraisalId } });
    if (!appraisal) throw new NotFoundException('Appraisal not found');
    if (appraisal.status !== 'APPRAISER_CONFIRMED') {
      throw new BadRequestException(
        `Appraisal cannot be approved from status ${appraisal.status} — appraiser must confirm first`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.appraisal.update({
        where: { id: appraisalId },
        data: {
          status: 'LOCKED',
          approvedById: actor.id,
          approvedAt: new Date(),
          notes: dto.notes ?? appraisal.notes,
        },
      });

      await tx.loan.update({
        where: { id: appraisal.loanId },
        data: { status: 'APPROVED' },
      });

      await this.audit.log(
        {
          entityType: 'Appraisal',
          entityId: appraisalId,
          action: 'APPRAISAL_APPROVED_AND_LOCKED',
          userId: actor.id,
          roleAtTime: actor.role,
          result: 'SUCCESS',
        },
        tx,
      );

      return updated;
    });
  }
}
