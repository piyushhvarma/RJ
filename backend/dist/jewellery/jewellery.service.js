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
        const isLocked = loan.appraisals.some((a) => a.status === 'LOCKED');
        if (isLocked) {
            throw new BadRequestException('This loan\'s appraisal is locked — adding jewellery requires an authorized amendment');
        }
        const stoneWeight = dto.stoneWeight ?? 0;
        const netWeight = Number((dto.grossWeight - stoneWeight).toFixed(3));
        if (netWeight <= 0) {
            throw new BadRequestException('Net weight must be positive — check gross/stone weight');
        }
        const valuation = Number((netWeight * dto.valuationRate).toFixed(2));
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
                    stoneWeight,
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
};
JewelleryService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService,
        IdGeneratorService,
        AuditService])
], JewelleryService);
export { JewelleryService };
//# sourceMappingURL=jewellery.service.js.map