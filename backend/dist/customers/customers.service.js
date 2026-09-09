var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { IdGeneratorService } from '../common/services/id-generator.service.js';
import { AuditService } from '../audit/audit.service.js';
let CustomersService = class CustomersService {
    prisma;
    ids;
    audit;
    constructor(prisma, ids, audit) {
        this.prisma = prisma;
        this.ids = ids;
        this.audit = audit;
    }
    async create(dto, actor) {
        return this.prisma.$transaction(async (tx) => {
            const customerCode = await this.ids.next('CUS', tx);
            const customer = await tx.customer.create({
                data: {
                    customerCode,
                    fullName: dto.fullName,
                    guardianName: dto.guardianName,
                    dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
                    mobile: dto.mobile,
                    alternateMobile: dto.alternateMobile,
                    address: dto.address,
                    city: dto.city,
                    state: dto.state,
                    pincode: dto.pincode,
                    occupation: dto.occupation,
                    photoUrl: dto.photoUrl,
                    createdById: actor.id,
                },
            });
            if (dto.aadhaarNumber) {
                const clean = dto.aadhaarNumber.replace(/\D/g, '');
                const masked = clean.length >= 4 ? `XXXX-XXXX-${clean.slice(-4)}` : dto.aadhaarNumber;
                const documentCode = await this.ids.next('DOC', tx);
                await tx.customerDocument.create({
                    data: {
                        documentCode,
                        customerId: customer.id,
                        docType: 'AADHAAR',
                        docNumberMasked: masked,
                        fileUrl: dto.aadhaarFileUrl ?? '',
                        verificationStatus: 'VERIFIED',
                        verifiedById: actor.id,
                        verifiedAt: new Date(),
                    },
                });
                await tx.customer.update({
                    where: { id: customer.id },
                    data: { kycStatus: 'VERIFIED' },
                });
            }
            await this.audit.log({
                entityType: 'Customer',
                entityId: customer.id,
                action: 'CUSTOMER_REGISTERED',
                userId: actor.id,
                roleAtTime: actor.role,
                newValue: { customerCode, fullName: dto.fullName, mobile: dto.mobile },
                result: 'SUCCESS',
            }, tx);
            return customer;
        });
    }
    async updatePhoto(id, photoUrl, actor) {
        const customer = await this.prisma.customer.findUnique({ where: { id } });
        if (!customer)
            throw new NotFoundException('Customer not found');
        const updated = await this.prisma.customer.update({
            where: { id },
            data: { photoUrl },
        });
        await this.audit.log({
            entityType: 'Customer',
            entityId: id,
            action: 'CUSTOMER_PHOTO_UPDATED',
            userId: actor.id,
            roleAtTime: actor.role,
            result: 'SUCCESS',
        });
        return updated;
    }
    async addDocument(id, dto, actor) {
        const customer = await this.prisma.customer.findUnique({ where: { id } });
        if (!customer)
            throw new NotFoundException('Customer not found');
        const documentCode = await this.ids.next('DOC');
        let docNumberMasked = dto.docNumber;
        const clean = dto.docNumber.replace(/\D/g, '');
        if (dto.docType === 'AADHAAR' && clean.length >= 4) {
            docNumberMasked = `XXXX-XXXX-${clean.slice(-4)}`;
        }
        else if (dto.docType === 'PAN' && dto.docNumber.length >= 4) {
            docNumberMasked = `XXXXXX${dto.docNumber.slice(-4)}`;
        }
        const status = dto.verificationStatus ?? 'VERIFIED';
        const [doc] = await this.prisma.$transaction([
            this.prisma.customerDocument.create({
                data: {
                    documentCode,
                    customerId: id,
                    docType: dto.docType,
                    docNumberMasked,
                    fileUrl: dto.fileUrl,
                    issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
                    expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
                    verificationStatus: status,
                    verifiedById: actor.id,
                    verifiedAt: new Date(),
                },
            }),
            this.prisma.customer.update({
                where: { id },
                data: { kycStatus: status },
            }),
        ]);
        await this.audit.log({
            entityType: 'Customer',
            entityId: id,
            action: 'CUSTOMER_DOCUMENT_ADDED',
            userId: actor.id,
            roleAtTime: actor.role,
            newValue: { documentCode, docType: dto.docType, docNumberMasked },
            result: 'SUCCESS',
        });
        return doc;
    }
    async findById(id) {
        const customer = await this.prisma.customer.findUnique({
            where: { id },
            include: {
                documents: { orderBy: { createdAt: 'desc' } },
                biometric: true,
                loans: { orderBy: { createdAt: 'desc' } },
            },
        });
        if (!customer)
            throw new NotFoundException('Customer not found');
        return customer;
    }
    async search(query) {
        if (!query) {
            return this.prisma.customer.findMany({ take: 25, orderBy: { createdAt: 'desc' } });
        }
        return this.prisma.customer.findMany({
            where: {
                OR: [
                    { fullName: { contains: query, mode: 'insensitive' } },
                    { mobile: { contains: query } },
                    { customerCode: { contains: query, mode: 'insensitive' } },
                ],
            },
            take: 25,
        });
    }
};
CustomersService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService,
        IdGeneratorService,
        AuditService])
], CustomersService);
export { CustomersService };
//# sourceMappingURL=customers.service.js.map