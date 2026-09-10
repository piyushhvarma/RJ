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
let LoansService = class LoansService {
    prisma;
    ids;
    audit;
    constructor(prisma, ids, audit) {
        this.prisma = prisma;
        this.ids = ids;
        this.audit = audit;
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
};
LoansService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService,
        IdGeneratorService,
        AuditService])
], LoansService);
export { LoansService };
//# sourceMappingURL=loans.service.js.map