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
import { AuditService } from '../audit/audit.service.js';
let AppraisalService = class AppraisalService {
    prisma;
    audit;
    constructor(prisma, audit) {
        this.prisma = prisma;
        this.audit = audit;
    }
    async create(dto, actor) {
        const loan = await this.prisma.loan.findUnique({
            where: { id: dto.loanId },
            include: { jewelleryItems: true },
        });
        if (!loan)
            throw new NotFoundException('Loan not found');
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
    async confirm(appraisalId, actor) {
        const appraisal = await this.prisma.appraisal.findUnique({ where: { id: appraisalId } });
        if (!appraisal)
            throw new NotFoundException('Appraisal not found');
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
            await this.audit.log({
                entityType: 'Appraisal',
                entityId: appraisalId,
                action: 'APPRAISAL_CONFIRMED',
                userId: actor.id,
                roleAtTime: actor.role,
                result: 'SUCCESS',
            }, tx);
            return updated;
        });
    }
    async approve(appraisalId, dto, actor) {
        const appraisal = await this.prisma.appraisal.findUnique({ where: { id: appraisalId } });
        if (!appraisal)
            throw new NotFoundException('Appraisal not found');
        if (appraisal.status !== 'APPRAISER_CONFIRMED') {
            throw new BadRequestException(`Appraisal cannot be approved from status ${appraisal.status} — appraiser must confirm first`);
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
            await this.audit.log({
                entityType: 'Appraisal',
                entityId: appraisalId,
                action: 'APPRAISAL_APPROVED_AND_LOCKED',
                userId: actor.id,
                roleAtTime: actor.role,
                result: 'SUCCESS',
            }, tx);
            return updated;
        });
    }
};
AppraisalService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService,
        AuditService])
], AppraisalService);
export { AppraisalService };
//# sourceMappingURL=appraisal.service.js.map