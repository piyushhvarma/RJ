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