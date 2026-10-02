import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { IdGeneratorService } from '../common/services/id-generator.service.js';
import { AuditService } from '../audit/audit.service.js';
import { InterestService } from '../interest/interest.service.js';
import { StorageService } from '../common/storage/storage.service.js';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { CreateLoanDto } from './dto/create-loan.dto.js';
import { DisburseLoanDto } from './dto/disburse-loan.dto.js';
import { ListLoansDto } from './dto/list-loans.dto.js';
import { TopUpLoanDto, TopUpMode } from './dto/topup-loan.dto.js';
import { CloseLoanDto } from './dto/close-loan.dto.js';
import { CounterOriginationDto } from './dto/counter-origination.dto.js';

@Injectable()
export class LoansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ids: IdGeneratorService,
    private readonly audit: AuditService,
    private readonly interestService: InterestService,
    private readonly storage: StorageService,
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

  /**
   * Pre-flight validation checklist for loan closure.
   * Evaluates financial balance, safe vault packet status, biometrics, and jewellery items.
   */
  async getClosureChecklist(id: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { id },
      include: {
        customer: true,
        packet: { include: { storageLocation: true } },
        jewelleryItems: true,
        ledgerEntries: { orderBy: { createdAt: 'asc' } },
        bioVerifications: { orderBy: { timestamp: 'desc' }, take: 5 },
      },
    });

    if (!loan) throw new NotFoundException('Loan not found');

    // Calculate current outstanding principal
    const currentPrincipal = loan.ledgerEntries.reduce((balance, entry) => {
      if (entry.type === 'DISBURSEMENT') return balance + entry.amount;
      if (entry.type === 'PRINCIPAL_PAID') return balance - entry.amount;
      if (entry.type === 'REVERSAL') return balance - entry.amount;
      return balance;
    }, 0);

    const isSettled = currentPrincipal <= 0.5;
    const packetRetrieved = ['IN_CLOSURE_PROCESS', 'RETRIEVED'].includes(loan.packet?.status ?? '');
    const biometricVerified = loan.bioVerifications.some(
      (v) => v.result === 'MATCH' || v.fallbackUsed === true,
    );

    const blockers: string[] = [];

    if (loan.status === 'CLOSED') {
      blockers.push('Loan is already closed');
    }
    if (loan.status === 'HOLD') {
      blockers.push(`Loan is on HOLD (${loan.holdReason ?? 'dispute resolution required'})`);
    }
    if (loan.status === 'DRAFT') {
      blockers.push('Loan is still in DRAFT status and was never disbursed');
    }
    if (!isSettled) {
      blockers.push(
        `Outstanding principal of ₹${currentPrincipal.toLocaleString('en-IN', { minimumFractionDigits: 2 })} must be fully paid first`,
      );
    }
    if (!loan.packet) {
      blockers.push('No collateral custody packet found for this loan');
    } else if (loan.packet.status === 'STORED') {
      blockers.push(
        `Collateral packet ${loan.packet.packetCode} is still locked in vault (${loan.packet.storageLocation?.label ?? 'Safe Box'}) and must be retrieved before gold release`,
      );
    } else if (loan.packet.status === 'RELEASED') {
      blockers.push('Collateral packet has already been released');
    }

    if (!biometricVerified) {
      blockers.push('Customer identity or biometric verification must be verified or authorized with override');
    }

    return {
      loanId: loan.id,
      loanCode: loan.loanCode,
      status: loan.status,
      canClose: blockers.length === 0,
      outstandingPrincipal: Math.max(0, currentPrincipal),
      isSettled,
      packetStatus: loan.packet?.status ?? null,
      packetRetrieved,
      storageLocation: loan.packet?.storageLocation?.label ?? null,
      biometricVerified,
      jewelleryItemCount: loan.jewelleryItems.length,
      totalGrossWeight: loan.jewelleryItems.reduce((s, i) => s + (i.grossWeight || 0), 0),
      totalNetWeight: loan.jewelleryItems.reduce((s, i) => s + (i.netWeight || 0), 0),
      blockers,
    };
  }

  /**
   * Finalizes loan closure and gold handover.
   * Atomically marks Loan as CLOSED, Packet as RELEASED, and all JewelleryItems as RELEASED.
   * Enforces role permissions (OWNER/MANAGER only) and all PRD §43/§46 non-negotiable rules.
   */
  async closeLoan(id: string, dto: CloseLoanDto, actor: AuthenticatedUser) {
    const loan = await this.prisma.loan.findUnique({
      where: { id },
      include: {
        customer: true,
        packet: { include: { storageLocation: true } },
        jewelleryItems: true,
        ledgerEntries: { orderBy: { createdAt: 'asc' } },
        bioVerifications: { orderBy: { timestamp: 'desc' } },
      },
    });

    if (!loan) throw new NotFoundException('Loan not found');

    if (loan.status === 'CLOSED') {
      throw new BadRequestException('Loan is already closed');
    }
    if (loan.status === 'HOLD') {
      throw new BadRequestException(`Cannot close loan: currently on HOLD (${loan.holdReason ?? 'dispute'})`);
    }
    if (!['ACTIVE', 'OVERDUE', 'NOTICE'].includes(loan.status)) {
      throw new BadRequestException(`Cannot close loan with status ${loan.status}`);
    }

    // 1. Enforce zero financial balance
    const currentPrincipal = loan.ledgerEntries.reduce((balance, entry) => {
      if (entry.type === 'DISBURSEMENT') return balance + entry.amount;
      if (entry.type === 'PRINCIPAL_PAID') return balance - entry.amount;
      if (entry.type === 'REVERSAL') return balance - entry.amount;
      return balance;
    }, 0);

    if (currentPrincipal > 0.5) {
      throw new BadRequestException(
        `Cannot close loan with outstanding principal of ₹${currentPrincipal.toFixed(2)}. Full settlement payment is required before gold release.`,
      );
    }

    // 2. Enforce packet status
    if (!loan.packet) {
      throw new BadRequestException('No packet associated with this loan');
    }
    if (!['IN_CLOSURE_PROCESS', 'RETRIEVED'].includes(loan.packet.status)) {
      throw new BadRequestException(
        `Packet must be retrieved from vault before release (current status: ${loan.packet.status})`,
      );
    }

    // 3. Enforce jewellery verification confirmation
    if (!dto.verifiedJewelleryCount) {
      throw new BadRequestException(
        'Physical jewellery count and weights must be verified against appraisal before releasing gold',
      );
    }

    // 4. Enforce biometric verification or manager override
    const hasValidBio = loan.bioVerifications.some(
      (v) => v.result === 'MATCH' || v.fallbackUsed === true,
    );
    if (!hasValidBio && !dto.biometricOverrideReason) {
      throw new BadRequestException(
        'Biometric verification or an authorized manual override reason is required for loan closure',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();

      // Log manual biometric override if supplied
      if (dto.biometricOverrideReason && !hasValidBio) {
        await tx.biometricVerificationLog.create({
          data: {
            customerId: loan.customerId,
            loanId: loan.id,
            deviceId: 'MANUAL_FALLBACK',
            result: 'NO_MATCH',
            attemptNumber: 1,
            fallbackUsed: true,
            fallbackReason: dto.biometricOverrideReason,
            verifiedById: actor.id,
          },
        });
      }

      // Update customer signature if supplied
      if (dto.customerSignatureUrl) {
        await tx.customer.update({
          where: { id: loan.customerId },
          data: { signatureUrl: dto.customerSignatureUrl },
        });
      }

      // 1. Release Packet
      await tx.packet.update({
        where: { id: loan.packet!.id },
        data: {
          status: 'RELEASED',
          releasedAt: now,
        },
      });

      // 2. Add Packet Movement
      await tx.packetMovement.create({
        data: {
          packetId: loan.packet!.id,
          fromLocationId: loan.packet!.storageLocationId,
          reason: dto.notes ?? 'Loan closure: physical gold released to borrower',
          movedById: actor.id,
          returned: false,
        },
      });

      // 3. Release all attached JewelleryItems
      await tx.jewelleryItem.updateMany({
        where: { loanId: id },
        data: {
          status: 'RELEASED',
          releasedAt: now,
        },
      });

      // 4. Update Loan status to CLOSED
      const updatedLoan = await tx.loan.update({
        where: { id },
        data: {
          status: 'CLOSED',
        },
      });

      // 5. Audit Log: Loan Closed
      await this.audit.log(
        {
          entityType: 'Loan',
          entityId: id,
          action: 'LOAN_CLOSED',
          userId: actor.id,
          roleAtTime: actor.role,
          oldValue: { status: loan.status, packetStatus: loan.packet!.status },
          newValue: { status: 'CLOSED', packetStatus: 'RELEASED' },
          reason: dto.notes ?? 'Full loan settlement and gold collateral released to borrower',
          result: 'SUCCESS',
        },
        tx,
      );

      // 6. Audit Log: Packet Released
      await this.audit.log(
        {
          entityType: 'Packet',
          entityId: loan.packet!.id,
          action: 'PACKET_RELEASED',
          userId: actor.id,
          roleAtTime: actor.role,
          oldValue: { status: loan.packet!.status },
          newValue: { status: 'RELEASED' },
          reason: 'Released upon loan closure',
          result: 'SUCCESS',
        },
        tx,
      );

      return {
        success: true,
        loanId: updatedLoan.id,
        loanCode: updatedLoan.loanCode,
        status: updatedLoan.status,
        closedAt: now.toISOString(),
        releasedItemsCount: loan.jewelleryItems.length,
        packetCode: loan.packet!.packetCode,
        message: 'Loan successfully closed and gold collateral released to borrower',
      };
    });
  }

  /**
   * All-in-One Counter Loan Origination (Single-Screen / Naya Girvi Panel).
   * Atomically creates Loan, Jewellery Items, Photos, Appraisal, Packet, Safe Storage,
   * First-Month Interest deduction (if checked), Ledger entries, and Audit logs.
   */
  async counterOriginate(dto: CounterOriginationDto, actor: AuthenticatedUser) {
    if (!dto.jewelleryItems || dto.jewelleryItems.length === 0) {
      throw new BadRequestException('At least one jewellery collateral item is required');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Verify customer exists
      const customer = await tx.customer.findUnique({ where: { id: dto.customerId } });
      if (!customer) throw new NotFoundException('Customer not found');

      // Update customer photo or signature if newly provided
      const custUpdate: any = {};
      if (dto.customerPhotoUrl && dto.customerPhotoUrl.length > 50) {
        custUpdate.photoUrl = (await this.storage.normalizeAndStore(dto.customerPhotoUrl, 'customers')) ?? dto.customerPhotoUrl;
      }
      if (dto.customerSignatureUrl && dto.customerSignatureUrl.length > 50) {
        custUpdate.signatureUrl = (await this.storage.normalizeAndStore(dto.customerSignatureUrl, 'signatures')) ?? dto.customerSignatureUrl;
      }
      if (Object.keys(custUpdate).length > 0) {
        await tx.customer.update({
          where: { id: dto.customerId },
          data: custUpdate,
        });
      }

      // 2. Issue sequential loanCode
      const loanCode = await this.ids.next('GL', tx as any);

      // 3. Compute dates and tenure
      const sanctionedDate = dto.sanctionedDate ? new Date(dto.sanctionedDate) : new Date();
      const tenureMonths = dto.tenureMonths ?? 12;
      const maturityDate = new Date(sanctionedDate);
      maturityDate.setMonth(maturityDate.getMonth() + tenureMonths);

      // 4. Create Loan
      const loan = await tx.loan.create({
        data: {
          loanCode,
          customerId: dto.customerId,
          principalAmount: dto.principalAmount,
          interestRate: dto.interestRate,
          interestType: dto.interestType ?? 'MONTHLY_SIMPLE',
          sanctionedDate,
          maturityDate,
          status: 'ACTIVE',
          createdById: actor.id,
          approvedById: actor.id,
        },
      });

      // 5. Create Jewellery Items & Photos
      let totalNetWeight = 0;
      let totalGrossWeight = 0;
      let totalValuation = 0;

      for (let i = 0; i < dto.jewelleryItems.length; i++) {
        const it = dto.jewelleryItems[i];
        const itemCode = this.ids.jewelleryItemCode(loanCode, i + 1);
        totalNetWeight += it.netWeight;
        totalGrossWeight += it.grossWeight;
        totalValuation += it.valuation;

        const item = await tx.jewelleryItem.create({
          data: {
            itemCode,
            loanId: loan.id,
            metalType: it.metalType ?? 'GOLD',
            category: it.category || 'Ornaments',
            description: it.description,
            grossWeight: it.grossWeight,
            stoneWeight: it.stoneWeight ?? 0,
            netWeight: it.netWeight,
            purityKarat: it.purityKarat || '22K',
            fineness: it.fineness ?? (it.purityKarat === '24K' ? 999 : it.purityKarat === '18K' ? 750 : 916),
            valuationRate: it.valuationRate,
            valuation: it.valuation,
            status: 'PLEDGED',
            ownershipDeclaration: true,
          },
        });

        if (it.photos && it.photos.length > 0) {
          for (const photo of it.photos) {
            if (photo && photo.length > 50) {
              const fileUrl = (await this.storage.normalizeAndStore(photo, 'jewellery')) ?? photo;
              await tx.jewelleryPhoto.create({
                data: {
                  jewelleryItemId: item.id,
                  fileUrl,
                  angle: 'counter_capture',
                  capturedById: actor.id,
                },
              });
            }
          }
        }
      }

      // 6. Create Appraisal (LOCKED)
      await tx.appraisal.create({
        data: {
          loanId: loan.id,
          appraiserId: actor.id,
          approvedById: actor.id,
          approvedAt: new Date(),
          status: 'LOCKED',
          goldRateSource: 'Counter Gold Rate',
          goldRateValue: dto.jewelleryItems[0]?.valuationRate ?? 0,
          goldRateAt: new Date(),
          notes: dto.notes ?? 'Counter appraisal confirmed and locked at origination',
        },
      });

      // 7. Create Packet & Safe Vault Location
      const packetCode = await this.ids.next('PKT', tx as any);
      const label = dto.storageLocationLabel?.trim() || `Box-${loanCode.slice(-4)}`;

      const location = await tx.storageLocation.upsert({
        where: {
          branch_safe_locker_shelf_position: {
            branch: 'Main Branch',
            safe: 'Main Vault',
            locker: label,
            shelf: 'A',
            position: '1',
          },
        },
        create: {
          branch: 'Main Branch',
          safe: 'Main Vault',
          locker: label,
          shelf: 'A',
          position: '1',
          label,
        },
        update: {},
      });

      const packet = await tx.packet.create({
        data: {
          packetCode,
          loanId: loan.id,
          status: 'STORED',
          storageLocationId: location.id,
          sealedAt: new Date(),
          storedAt: new Date(),
          createdById: actor.id,
        },
      });

      await tx.packetMovement.create({
        data: {
          packetId: packet.id,
          toLocationId: location.id,
          reason: 'Initial safe storage at counter origination',
          movedById: actor.id,
          returned: true,
        },
      });

      // 8. Disbursement Ledger Entry
      await tx.ledgerEntry.create({
        data: {
          loanId: loan.id,
          type: 'DISBURSEMENT',
          amount: dto.principalAmount,
          balanceAfter: dto.principalAmount,
          createdById: actor.id,
          reason: `Counter loan sanctioned (${dto.paymentMode ?? 'CASH'})`,
        },
      });

      // 9. First Month Interest deduction if enabled
      let firstMonthInterest = 0;
      let netCashDisbursed = dto.principalAmount;

      if (dto.deductFirstMonthInterest) {
        const monthlyRate = (dto.interestRate / 100) / 12;
        firstMonthInterest = Math.round(dto.principalAmount * monthlyRate);
        netCashDisbursed = dto.principalAmount - firstMonthInterest;

        const paymentCode = await this.ids.next('PAY', tx as any);
        const payment = await tx.payment.create({
          data: {
            paymentCode,
            loanId: loan.id,
            amount: firstMonthInterest,
            mode: dto.paymentMode ?? 'CASH',
            principalComponent: 0,
            interestComponent: firstMonthInterest,
            penaltyComponent: 0,
            otherCharges: 0,
            cashierId: actor.id,
            receiptNumber: paymentCode,
            transactionRef: dto.transactionRef,
            notes: 'First month interest deducted at counter disbursement',
          },
        });

        await tx.ledgerEntry.create({
          data: {
            loanId: loan.id,
            type: 'INTEREST_PAID',
            amount: firstMonthInterest,
            balanceAfter: dto.principalAmount,
            relatedPaymentId: payment.id,
            createdById: actor.id,
            reason: 'First month interest deducted from principal at disbursement',
          },
        });
      }

      // 10. Audit Logs
      await this.audit.log(
        {
          entityType: 'Loan',
          entityId: loan.id,
          action: 'LOAN_COUNTER_ORIGINATED',
          userId: actor.id,
          roleAtTime: actor.role,
          newValue: {
            loanCode,
            customerId: dto.customerId,
            principalAmount: dto.principalAmount,
            netCashDisbursed,
            itemsCount: dto.jewelleryItems.length,
            box: label,
            deductFirstMonthInterest: Boolean(dto.deductFirstMonthInterest),
          },
          result: 'SUCCESS',
        },
        tx,
      );

      await this.audit.log(
        {
          entityType: 'Packet',
          entityId: packet.id,
          action: 'PACKET_STORED',
          userId: actor.id,
          roleAtTime: actor.role,
          newValue: { packetCode, location: label },
          result: 'SUCCESS',
        },
        tx,
      );

      return {
        success: true,
        loanId: loan.id,
        loanCode: loan.loanCode,
        packetCode: packet.packetCode,
        storageLocation: label,
        principalAmount: dto.principalAmount,
        netCashDisbursed,
        totalNetWeight,
        totalGrossWeight,
        totalValuation,
        message: 'Counter loan created and collateral sealed in vault successfully',
      };
    });
  }
}

