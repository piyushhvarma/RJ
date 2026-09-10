import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { IdGeneratorService } from '../common/services/id-generator.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { CreateLoanDto } from './dto/create-loan.dto.js';
import { DisburseLoanDto } from './dto/disburse-loan.dto.js';
import { ListLoansDto } from './dto/list-loans.dto.js';

@Injectable()
export class LoansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ids: IdGeneratorService,
    private readonly audit: AuditService,
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
}
