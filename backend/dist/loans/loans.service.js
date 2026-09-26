var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { IdGeneratorService } from '../common/services/id-generator.service.js';
import { AuditService } from '../audit/audit.service.js';
import { InterestService } from '../interest/interest.service.js';
import { TopUpMode } from './dto/topup-loan.dto.js';
let LoansService = class LoansService {
    prisma;
    ids;
    audit;
    interestService;
    constructor(prisma, ids, audit, interestService) {
        this.prisma = prisma;
        this.ids = ids;
        this.audit = audit;
        this.interestService = interestService;
    }
    async create(dto, actor) {
        const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
        if (!customer)
            throw new NotFoundException('Customer not found');
        return this.prisma.$transaction(async (tx) => {
            const loanCode = await this.ids.next('GL', tx);
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
            await this.audit.log({
                entityType: 'Loan',
                entityId: loan.id,
                action: 'LOAN_CREATED',
                userId: actor.id,
                roleAtTime: actor.role,
                newValue: { loanCode, customerId: dto.customerId, status: 'DRAFT' },
                result: 'SUCCESS',
            }, tx);
            return loan;
        });
    }
    async findById(id) {
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
        if (!loan)
            throw new NotFoundException('Loan not found');
        return loan;
    }
    async disburse(id, dto, actor) {
        const loan = await this.prisma.loan.findUnique({
            where: { id },
            include: { jewelleryItems: true, appraisals: true },
        });
        if (!loan)
            throw new NotFoundException('Loan not found');
        if (loan.status !== 'DRAFT' && loan.status !== 'APPROVED') {
            throw new BadRequestException(`Loan cannot be disbursed from status ${loan.status}`);
        }
        if (loan.jewelleryItems.length === 0) {
            throw new BadRequestException('Cannot disburse a loan with no jewellery collateral');
        }
        const appraisalComplete = loan.appraisals.some((a) => a.status === 'MANAGER_APPROVED' || a.status === 'LOCKED');
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
            await this.audit.log({
                entityType: 'Loan',
                entityId: id,
                action: 'LOAN_DISBURSED',
                userId: actor.id,
                roleAtTime: actor.role,
                oldValue: { status: loan.status },
                newValue: { status: 'ACTIVE', principalAmount: dto.principalAmount },
                result: 'SUCCESS',
            }, tx);
            return updated;
        });
    }
    async findAll(dto) {
        const page = dto.page && dto.page > 0 ? Number(dto.page) : 1;
        const limit = dto.limit && dto.limit > 0 ? Math.min(Number(dto.limit), 100) : 20;
        const skip = (page - 1) * limit;
        const where = {};
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
        const orderBy = {};
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
    async topupOrRenew(id, dto, actor) {
        const loan = await this.prisma.loan.findUnique({
            where: { id },
            include: {
                customer: true,
                scheme: true,
                jewelleryItems: true,
                ledgerEntries: { orderBy: { createdAt: 'asc' } },
            },
        });
        if (!loan)
            throw new NotFoundException('Loan not found');
        if (!['ACTIVE', 'OVERDUE', 'NOTICE'].includes(loan.status)) {
            throw new BadRequestException(`Cannot top up or renew a loan with status ${loan.status}`);
        }
        const currentPrincipal = loan.ledgerEntries.reduce((balance, entry) => {
            if (entry.type === 'DISBURSEMENT')
                return balance + entry.amount;
            if (entry.type === 'PRINCIPAL_PAID')
                return balance - entry.amount;
            if (entry.type === 'REVERSAL')
                return balance - entry.amount;
            return balance;
        }, 0);
        const newPrincipal = currentPrincipal + dto.topupAmount;
        const isRenew = dto.mode === TopUpMode.RENEW_WITH_INTEREST_DEDUCTED;
        const interestDeducted = dto.interestDeducted ?? 0;
        const now = new Date();
        return this.prisma.$transaction(async (tx) => {
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
            let paymentRecord = null;
            if (isRenew && interestDeducted > 0) {
                const paymentCode = await this.ids.next('PAY', tx);
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
            const tenureMonths = dto.tenureMonths ?? 12;
            const newMaturity = new Date(now);
            newMaturity.setMonth(newMaturity.getMonth() + tenureMonths);
            const updateData = {
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
            const docCode = await this.ids.next('DOC', tx);
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
            await this.audit.log({
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
            }, tx);
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
    async getClosureChecklist(id) {
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
        if (!loan)
            throw new NotFoundException('Loan not found');
        const currentPrincipal = loan.ledgerEntries.reduce((balance, entry) => {
            if (entry.type === 'DISBURSEMENT')
                return balance + entry.amount;
            if (entry.type === 'PRINCIPAL_PAID')
                return balance - entry.amount;
            if (entry.type === 'REVERSAL')
                return balance - entry.amount;
            return balance;
        }, 0);
        const isSettled = currentPrincipal <= 0.5;
        const packetRetrieved = ['IN_CLOSURE_PROCESS', 'RETRIEVED'].includes(loan.packet?.status ?? '');
        const biometricVerified = loan.bioVerifications.some((v) => v.result === 'MATCH' || v.fallbackUsed === true);
        const blockers = [];
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
            blockers.push(`Outstanding principal of ₹${currentPrincipal.toLocaleString('en-IN', { minimumFractionDigits: 2 })} must be fully paid first`);
        }
        if (!loan.packet) {
            blockers.push('No collateral custody packet found for this loan');
        }
        else if (loan.packet.status === 'STORED') {
            blockers.push(`Collateral packet ${loan.packet.packetCode} is still locked in vault (${loan.packet.storageLocation?.label ?? 'Safe Box'}) and must be retrieved before gold release`);
        }
        else if (loan.packet.status === 'RELEASED') {
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
    async closeLoan(id, dto, actor) {
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
        if (!loan)
            throw new NotFoundException('Loan not found');
        if (loan.status === 'CLOSED') {
            throw new BadRequestException('Loan is already closed');
        }
        if (loan.status === 'HOLD') {
            throw new BadRequestException(`Cannot close loan: currently on HOLD (${loan.holdReason ?? 'dispute'})`);
        }
        if (!['ACTIVE', 'OVERDUE', 'NOTICE'].includes(loan.status)) {
            throw new BadRequestException(`Cannot close loan with status ${loan.status}`);
        }
        const currentPrincipal = loan.ledgerEntries.reduce((balance, entry) => {
            if (entry.type === 'DISBURSEMENT')
                return balance + entry.amount;
            if (entry.type === 'PRINCIPAL_PAID')
                return balance - entry.amount;
            if (entry.type === 'REVERSAL')
                return balance - entry.amount;
            return balance;
        }, 0);
        if (currentPrincipal > 0.5) {
            throw new BadRequestException(`Cannot close loan with outstanding principal of ₹${currentPrincipal.toFixed(2)}. Full settlement payment is required before gold release.`);
        }
        if (!loan.packet) {
            throw new BadRequestException('No packet associated with this loan');
        }
        if (!['IN_CLOSURE_PROCESS', 'RETRIEVED'].includes(loan.packet.status)) {
            throw new BadRequestException(`Packet must be retrieved from vault before release (current status: ${loan.packet.status})`);
        }
        if (!dto.verifiedJewelleryCount) {
            throw new BadRequestException('Physical jewellery count and weights must be verified against appraisal before releasing gold');
        }
        const hasValidBio = loan.bioVerifications.some((v) => v.result === 'MATCH' || v.fallbackUsed === true);
        if (!hasValidBio && !dto.biometricOverrideReason) {
            throw new BadRequestException('Biometric verification or an authorized manual override reason is required for loan closure');
        }
        return this.prisma.$transaction(async (tx) => {
            const now = new Date();
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
            if (dto.customerSignatureUrl) {
                await tx.customer.update({
                    where: { id: loan.customerId },
                    data: { signatureUrl: dto.customerSignatureUrl },
                });
            }
            await tx.packet.update({
                where: { id: loan.packet.id },
                data: {
                    status: 'RELEASED',
                    releasedAt: now,
                },
            });
            await tx.packetMovement.create({
                data: {
                    packetId: loan.packet.id,
                    fromLocationId: loan.packet.storageLocationId,
                    reason: dto.notes ?? 'Loan closure: physical gold released to borrower',
                    movedById: actor.id,
                    returned: false,
                },
            });
            await tx.jewelleryItem.updateMany({
                where: { loanId: id },
                data: {
                    status: 'RELEASED',
                    releasedAt: now,
                },
            });
            const updatedLoan = await tx.loan.update({
                where: { id },
                data: {
                    status: 'CLOSED',
                },
            });
            await this.audit.log({
                entityType: 'Loan',
                entityId: id,
                action: 'LOAN_CLOSED',
                userId: actor.id,
                roleAtTime: actor.role,
                oldValue: { status: loan.status, packetStatus: loan.packet.status },
                newValue: { status: 'CLOSED', packetStatus: 'RELEASED' },
                reason: dto.notes ?? 'Full loan settlement and gold collateral released to borrower',
                result: 'SUCCESS',
            }, tx);
            await this.audit.log({
                entityType: 'Packet',
                entityId: loan.packet.id,
                action: 'PACKET_RELEASED',
                userId: actor.id,
                roleAtTime: actor.role,
                oldValue: { status: loan.packet.status },
                newValue: { status: 'RELEASED' },
                reason: 'Released upon loan closure',
                result: 'SUCCESS',
            }, tx);
            return {
                success: true,
                loanId: updatedLoan.id,
                loanCode: updatedLoan.loanCode,
                status: updatedLoan.status,
                closedAt: now.toISOString(),
                releasedItemsCount: loan.jewelleryItems.length,
                packetCode: loan.packet.packetCode,
                message: 'Loan successfully closed and gold collateral released to borrower',
            };
        });
    }
    async counterOriginate(dto, actor) {
        if (!dto.jewelleryItems || dto.jewelleryItems.length === 0) {
            throw new BadRequestException('At least one jewellery collateral item is required');
        }
        return this.prisma.$transaction(async (tx) => {
            const customer = await tx.customer.findUnique({ where: { id: dto.customerId } });
            if (!customer)
                throw new NotFoundException('Customer not found');
            const custUpdate = {};
            if (dto.customerPhotoUrl && dto.customerPhotoUrl.length > 50) {
                custUpdate.photoUrl = dto.customerPhotoUrl;
            }
            if (dto.customerSignatureUrl && dto.customerSignatureUrl.length > 50) {
                custUpdate.signatureUrl = dto.customerSignatureUrl;
            }
            if (Object.keys(custUpdate).length > 0) {
                await tx.customer.update({
                    where: { id: dto.customerId },
                    data: custUpdate,
                });
            }
            const loanCode = await this.ids.next('GL', tx);
            const sanctionedDate = dto.sanctionedDate ? new Date(dto.sanctionedDate) : new Date();
            const tenureMonths = dto.tenureMonths ?? 12;
            const maturityDate = new Date(sanctionedDate);
            maturityDate.setMonth(maturityDate.getMonth() + tenureMonths);
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
                            await tx.jewelleryPhoto.create({
                                data: {
                                    jewelleryItemId: item.id,
                                    fileUrl: photo,
                                    angle: 'counter_capture',
                                    capturedById: actor.id,
                                },
                            });
                        }
                    }
                }
            }
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
            const packetCode = await this.ids.next('PKT', tx);
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
            let firstMonthInterest = 0;
            let netCashDisbursed = dto.principalAmount;
            if (dto.deductFirstMonthInterest) {
                const monthlyRate = (dto.interestRate / 100) / 12;
                firstMonthInterest = Math.round(dto.principalAmount * monthlyRate);
                netCashDisbursed = dto.principalAmount - firstMonthInterest;
                const paymentCode = await this.ids.next('PAY', tx);
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
            await this.audit.log({
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
            }, tx);
            await this.audit.log({
                entityType: 'Packet',
                entityId: packet.id,
                action: 'PACKET_STORED',
                userId: actor.id,
                roleAtTime: actor.role,
                newValue: { packetCode, location: label },
                result: 'SUCCESS',
            }, tx);
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
};
LoansService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService,
        IdGeneratorService,
        AuditService,
        InterestService])
], LoansService);
export { LoansService };
//# sourceMappingURL=loans.service.js.map