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
import { StorageService } from '../common/storage/storage.service.js';
let CustomersService = class CustomersService {
    prisma;
    ids;
    audit;
    storage;
    constructor(prisma, ids, audit, storage) {
        this.prisma = prisma;
        this.ids = ids;
        this.audit = audit;
        this.storage = storage;
    }
    async create(dto, actor) {
        const photoUrl = await this.storage.normalizeAndStore(dto.photoUrl, 'customers');
        const aadhaarFileUrl = await this.storage.normalizeAndStore(dto.aadhaarFileUrl, 'kyc');
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
                    photoUrl: photoUrl ?? dto.photoUrl,
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
                        fileUrl: aadhaarFileUrl ?? dto.aadhaarFileUrl ?? '',
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
    async updatePhoto(id, rawPhotoUrl, actor) {
        const customer = await this.prisma.customer.findUnique({ where: { id } });
        if (!customer)
            throw new NotFoundException('Customer not found');
        const photoUrl = (await this.storage.normalizeAndStore(rawPhotoUrl, 'customers')) ?? rawPhotoUrl;
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
        const fileUrl = (await this.storage.normalizeAndStore(dto.fileUrl, 'kyc')) ?? dto.fileUrl;
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
                    fileUrl,
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
    async search(dto = {}) {
        const page = Math.max(1, dto.page ? Number(dto.page) : 1);
        const limit = Math.max(1, Math.min(100, dto.limit ? Number(dto.limit) : 25));
        const skip = (page - 1) * limit;
        const where = {};
        if (dto.kycStatus) {
            where.kycStatus = dto.kycStatus;
        }
        if (dto.q && dto.q.trim().length > 0) {
            const q = dto.q.trim();
            where.OR = [
                { fullName: { contains: q, mode: 'insensitive' } },
                { mobile: { contains: q } },
                { customerCode: { contains: q, mode: 'insensitive' } },
                { guardianName: { contains: q, mode: 'insensitive' } },
                { city: { contains: q, mode: 'insensitive' } },
            ];
        }
        const [items, total] = await Promise.all([
            this.prisma.customer.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    _count: { select: { loans: true, documents: true } },
                    biometric: { select: { status: true } },
                },
            }),
            this.prisma.customer.count({ where }),
        ]);
        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async update(id, dto, actor) {
        const customer = await this.prisma.customer.findUnique({ where: { id } });
        if (!customer)
            throw new NotFoundException('Customer not found');
        const updateData = {};
        if (dto.fullName !== undefined)
            updateData.fullName = dto.fullName.trim();
        if (dto.guardianName !== undefined)
            updateData.guardianName = dto.guardianName?.trim() || null;
        if (dto.dateOfBirth !== undefined)
            updateData.dateOfBirth = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
        if (dto.mobile !== undefined)
            updateData.mobile = dto.mobile?.trim() || null;
        if (dto.alternateMobile !== undefined)
            updateData.alternateMobile = dto.alternateMobile?.trim() || null;
        if (dto.address !== undefined)
            updateData.address = dto.address?.trim() || null;
        if (dto.city !== undefined)
            updateData.city = dto.city?.trim() || null;
        if (dto.state !== undefined)
            updateData.state = dto.state?.trim() || null;
        if (dto.pincode !== undefined)
            updateData.pincode = dto.pincode?.trim() || null;
        if (dto.occupation !== undefined)
            updateData.occupation = dto.occupation?.trim() || null;
        if (dto.photoUrl !== undefined) {
            const normalizedPhoto = await this.storage.normalizeAndStore(dto.photoUrl, 'customers');
            updateData.photoUrl = normalizedPhoto ?? dto.photoUrl;
        }
        const updated = await this.prisma.customer.update({
            where: { id },
            data: updateData,
        });
        await this.audit.log({
            entityType: 'Customer',
            entityId: id,
            action: 'CUSTOMER_UPDATED',
            userId: actor.id,
            roleAtTime: actor.role,
            oldValue: {
                fullName: customer.fullName,
                mobile: customer.mobile,
                address: customer.address,
                guardianName: customer.guardianName,
            },
            newValue: updateData,
            result: 'SUCCESS',
        });
        return updated;
    }
};
CustomersService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService,
        IdGeneratorService,
        AuditService,
        StorageService])
], CustomersService);
export { CustomersService };
//# sourceMappingURL=customers.service.js.map