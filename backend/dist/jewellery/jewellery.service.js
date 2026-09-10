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
let JewelleryService = class JewelleryService {
    prisma;
    ids;
    audit;
    constructor(prisma, ids, audit) {
        this.prisma = prisma;
        this.ids = ids;
        this.audit = audit;
    }
    async create(dto, actor) {
        const loan = await this.prisma.loan.findUnique({
            where: { id: dto.loanId },
            include: { appraisals: true },
        });
        if (!loan)
            throw new NotFoundException('Loan not found');
        const lastAppraisal = loan.appraisals[loan.appraisals.length - 1];
        if (lastAppraisal && lastAppraisal.status === 'LOCKED') {
            throw new BadRequestException('Cannot add items to a loan with locked appraisal');
        }
        const netWeight = Math.round((dto.grossWeight - (dto.stoneWeight ?? 0)) * 1000) / 1000;
        if (netWeight <= 0)
            throw new BadRequestException('Net weight must be positive');
        const valuation = Math.round(netWeight * dto.valuationRate);
        return this.prisma.$transaction(async (tx) => {
            const existingCount = await tx.jewelleryItem.count({ where: { loanId: dto.loanId } });
            const itemCode = this.ids.jewelleryItemCode(loan.loanCode, existingCount + 1);
            const item = await tx.jewelleryItem.create({
                data: {
                    itemCode,
                    loanId: dto.loanId,
                    category: dto.category,
                    description: dto.description,
                    grossWeight: dto.grossWeight,
                    stoneWeight: dto.stoneWeight ?? 0,
                    netWeight,
                    purityKarat: dto.purityKarat,
                    fineness: dto.fineness,
                    valuationRate: dto.valuationRate,
                    valuation,
                    hallmarkDetails: dto.hallmarkDetails,
                    identifyingMarks: dto.identifyingMarks,
                    condition: dto.condition,
                    ownershipDeclaration: dto.ownershipDeclaration ?? false,
                    appraisalRemarks: dto.appraisalRemarks,
                },
            });
            await this.audit.log({
                entityType: 'JewelleryItem',
                entityId: item.id,
                action: 'JEWELLERY_ITEM_ADDED',
                userId: actor.id,
                roleAtTime: actor.role,
                newValue: { itemCode, netWeight, valuation },
                result: 'SUCCESS',
            }, tx);
            if (loan.status === 'DRAFT') {
                await tx.loan.update({ where: { id: loan.id }, data: { status: 'APPRAISAL_PENDING' } });
            }
            return item;
        });
    }
    async addPhoto(itemId, dto, actor) {
        const item = await this.prisma.jewelleryItem.findUnique({ where: { id: itemId } });
        if (!item)
            throw new NotFoundException('Jewellery item not found');
        return this.prisma.jewelleryPhoto.create({
            data: {
                jewelleryItemId: itemId,
                angle: dto.angle,
                fileUrl: dto.fileUrl,
                capturedById: actor.id,
            },
        });
    }
    async findByLoan(loanId) {
        return this.prisma.jewelleryItem.findMany({
            where: { loanId },
            include: { photos: true },
            orderBy: { itemCode: 'asc' },
        });
    }
    async findAll(dto) {
        if (dto.loanId) {
            const items = await this.findByLoan(dto.loanId);
            return {
                items,
                total: items.length,
                page: 1,
                limit: items.length,
                totalPages: 1,
                aggregates: {
                    totalGrossWeight: items.reduce((acc, i) => acc + i.grossWeight, 0),
                    totalNetWeight: items.reduce((acc, i) => acc + i.netWeight, 0),
                    totalValuation: items.reduce((acc, i) => acc + i.valuation, 0),
                },
            };
        }
        const page = dto.page && dto.page > 0 ? Number(dto.page) : 1;
        const limit = dto.limit && dto.limit > 0 ? Math.min(Number(dto.limit), 100) : 20;
        const skip = (page - 1) * limit;
        const where = {};
        if (dto.status)
            where.status = dto.status;
        if (dto.category)
            where.category = dto.category;
        if (dto.purityKarat)
            where.purityKarat = dto.purityKarat;
        if (dto.metalType === 'SILVER') {
            where.category = { startsWith: 'Silver' };
        }
        else if (dto.metalType === 'GOLD') {
            where.category = { startsWith: 'Gold' };
        }
        if (dto.q) {
            const q = dto.q.trim();
            where.OR = [
                { itemCode: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
                { category: { contains: q, mode: 'insensitive' } },
                { loan: { loanCode: { contains: q, mode: 'insensitive' } } },
                { loan: { customer: { fullName: { contains: q, mode: 'insensitive' } } } },
            ];
        }
        const [total, items, aggregates, goldAgg, silverAgg] = await Promise.all([
            this.prisma.jewelleryItem.count({ where }),
            this.prisma.jewelleryItem.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    photos: true,
                    loan: {
                        select: {
                            id: true,
                            loanCode: true,
                            status: true,
                            customer: {
                                select: {
                                    id: true,
                                    fullName: true,
                                    customerCode: true,
                                    mobile: true,
                                },
                            },
                        },
                    },
                },
            }),
            this.prisma.jewelleryItem.aggregate({
                where,
                _sum: {
                    grossWeight: true,
                    netWeight: true,
                    valuation: true,
                },
            }),
            this.prisma.jewelleryItem.aggregate({
                where: { ...where, category: { startsWith: 'Gold' } },
                _sum: {
                    grossWeight: true,
                    netWeight: true,
                    valuation: true,
                },
                _count: { id: true },
            }),
            this.prisma.jewelleryItem.aggregate({
                where: { ...where, category: { startsWith: 'Silver' } },
                _sum: {
                    grossWeight: true,
                    netWeight: true,
                    valuation: true,
                },
                _count: { id: true },
            }),
        ]);
        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            aggregates: {
                totalGrossWeight: aggregates._sum.grossWeight ?? 0,
                totalNetWeight: aggregates._sum.netWeight ?? 0,
                totalValuation: aggregates._sum.valuation ?? 0,
                gold: {
                    count: goldAgg._count.id,
                    grossWeight: goldAgg._sum.grossWeight ?? 0,
                    netWeight: goldAgg._sum.netWeight ?? 0,
                    valuation: goldAgg._sum.valuation ?? 0,
                },
                silver: {
                    count: silverAgg._count.id,
                    grossWeight: silverAgg._sum.grossWeight ?? 0,
                    netWeight: silverAgg._sum.netWeight ?? 0,
                    valuation: silverAgg._sum.valuation ?? 0,
                },
            },
        };
    }
    async findAllAppraisals(query) {
        const page = query?.page && query.page > 0 ? Number(query.page) : 1;
        const limit = query?.limit && query.limit > 0 ? Math.min(Number(query.limit), 100) : 20;
        const skip = (page - 1) * limit;
        const [total, items] = await Promise.all([
            this.prisma.appraisal.count(),
            this.prisma.appraisal.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    loan: {
                        select: {
                            id: true,
                            loanCode: true,
                            status: true,
                            principalAmount: true,
                            customer: {
                                select: {
                                    id: true,
                                    fullName: true,
                                    customerCode: true,
                                },
                            },
                            _count: {
                                select: {
                                    jewelleryItems: true,
                                },
                            },
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
JewelleryService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService,
        IdGeneratorService,
        AuditService])
], JewelleryService);
export { JewelleryService };
//# sourceMappingURL=jewellery.service.js.map