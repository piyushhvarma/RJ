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
import { AuditService } from '../audit/audit.service.js';
import { IdGeneratorService } from '../common/services/id-generator.service.js';
import { PdfGeneratorService } from './pdf-generator.service.js';
import crypto from 'crypto';
let DocumentsService = class DocumentsService {
    prisma;
    pdfGenerator;
    audit;
    idGenerator;
    constructor(prisma, pdfGenerator, audit, idGenerator) {
        this.prisma = prisma;
        this.pdfGenerator = pdfGenerator;
        this.audit = audit;
        this.idGenerator = idGenerator;
    }
    generateVerificationCode() {
        const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
        const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
        return `${part1}-${part2}`;
    }
    async getLoanFullDetails(loanId) {
        const loan = await this.prisma.loan.findUnique({
            where: { id: loanId },
            include: {
                customer: true,
                scheme: true,
                jewelleryItems: {
                    include: { photos: true },
                    orderBy: { itemCode: 'asc' },
                },
                appraisals: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
                packet: {
                    include: { storageLocation: true },
                },
                ledgerEntries: {
                    orderBy: { createdAt: 'desc' },
                },
                documents: {
                    include: { versions: true },
                },
            },
        });
        if (!loan)
            throw new NotFoundException(`Loan ${loanId} not found`);
        return loan;
    }
    async findByLoan(loanId) {
        return this.prisma.document.findMany({
            where: { loanId },
            include: {
                versions: {
                    orderBy: { versionNumber: 'desc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getDocumentById(documentId) {
        const doc = await this.prisma.document.findUnique({
            where: { id: documentId },
            include: {
                loan: {
                    include: {
                        customer: true,
                        scheme: true,
                        jewelleryItems: true,
                        packet: { include: { storageLocation: true } },
                    },
                },
                versions: {
                    orderBy: { versionNumber: 'desc' },
                },
            },
        });
        if (!doc)
            throw new NotFoundException(`Document ${documentId} not found`);
        return doc;
    }
    async getPledgeAgreementPdf(loanId, user) {
        const loan = await this.getLoanFullDetails(loanId);
        const buffer = await this.pdfGenerator.generatePledgeAgreement(loan);
        if (user) {
            await this.recordDocumentGeneration(loan.id, 'PLEDGE_AGREEMENT', `pledge-agreement-${loan.loanCode}.pdf`, user);
        }
        return {
            buffer,
            filename: `PLEDGE_AGREEMENT_${loan.loanCode}.pdf`,
        };
    }
    async getJewelleryAnnexurePdf(loanId, user) {
        const loan = await this.getLoanFullDetails(loanId);
        const buffer = await this.pdfGenerator.generateJewelleryAnnexure(loan);
        if (user) {
            await this.recordDocumentGeneration(loan.id, 'APPRAISAL_SHEET', `jewellery-annexure-${loan.loanCode}.pdf`, user);
        }
        return {
            buffer,
            filename: `JEWELLERY_ANNEXURE_${loan.loanCode}.pdf`,
        };
    }
    async getPaymentReceiptPdf(paymentId, user) {
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                loan: {
                    include: {
                        customer: true,
                        scheme: true,
                    },
                },
            },
        });
        if (!payment)
            throw new NotFoundException(`Payment ${paymentId} not found`);
        const buffer = await this.pdfGenerator.generatePaymentReceipt(payment);
        if (user) {
            await this.recordDocumentGeneration(payment.loanId, 'PAYMENT_RECEIPT', `receipt-${payment.paymentCode}.pdf`, user);
        }
        return {
            buffer,
            filename: `PAYMENT_RECEIPT_${payment.paymentCode}.pdf`,
        };
    }
    async getClosureReceiptPdf(loanId, user) {
        const loan = await this.getLoanFullDetails(loanId);
        const buffer = await this.pdfGenerator.generateClosureReceipt(loan);
        if (user) {
            await this.recordDocumentGeneration(loan.id, 'CLOSURE', `closure-voucher-${loan.loanCode}.pdf`, user);
        }
        return {
            buffer,
            filename: `CLOSURE_VOUCHER_${loan.loanCode}.pdf`,
        };
    }
    async recordDocumentGeneration(loanId, type, fileName, user) {
        return this.prisma.$transaction(async (tx) => {
            let doc = await tx.document.findFirst({
                where: { loanId, type },
            });
            if (!doc) {
                const documentCode = await this.idGenerator.next('DOC', tx);
                doc = await tx.document.create({
                    data: {
                        documentCode,
                        loanId,
                        type,
                        status: 'GENERATED',
                        verificationCode: this.generateVerificationCode(),
                        currentVersion: 1,
                        versions: {
                            create: {
                                versionNumber: 1,
                                fileUrl: `/documents/files/${fileName}`,
                                createdById: user.id,
                            },
                        },
                    },
                });
            }
            else {
                const nextVer = doc.currentVersion + 1;
                await tx.documentVersion.create({
                    data: {
                        documentId: doc.id,
                        versionNumber: nextVer,
                        fileUrl: `/documents/files/${fileName}`,
                        reason: 'Re-generated / updated document',
                        createdById: user.id,
                    },
                });
                doc = await tx.document.update({
                    where: { id: doc.id },
                    data: {
                        currentVersion: nextVer,
                        status: 'GENERATED',
                    },
                });
            }
            await this.audit.log({
                entityType: 'Document',
                entityId: doc.id,
                action: 'DOCUMENT_GENERATED',
                userId: user.id,
                roleAtTime: user.role,
                newValue: { type, documentCode: doc.documentCode, currentVersion: doc.currentVersion },
                result: 'SUCCESS',
            }, tx);
            return doc;
        });
    }
    async markPrinted(documentId, user) {
        const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
        if (!doc)
            throw new NotFoundException('Document not found');
        const updated = await this.prisma.document.update({
            where: { id: documentId },
            data: { status: 'PRINTED' },
        });
        await this.audit.log({
            entityType: 'Document',
            entityId: documentId,
            action: 'DOCUMENT_PRINTED',
            userId: user.id,
            roleAtTime: user.role,
            oldValue: { status: doc.status },
            newValue: { status: 'PRINTED' },
            result: 'SUCCESS',
        });
        return updated;
    }
    async markSigned(documentId, user) {
        const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
        if (!doc)
            throw new NotFoundException('Document not found');
        const updated = await this.prisma.document.update({
            where: { id: documentId },
            data: { status: 'SIGNED_PHYSICALLY' },
        });
        await this.audit.log({
            entityType: 'Document',
            entityId: documentId,
            action: 'DOCUMENT_SIGNED_PHYSICALLY',
            userId: user.id,
            roleAtTime: user.role,
            oldValue: { status: doc.status },
            newValue: { status: 'SIGNED_PHYSICALLY' },
            result: 'SUCCESS',
        });
        return updated;
    }
};
DocumentsService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService,
        PdfGeneratorService,
        AuditService,
        IdGeneratorService])
], DocumentsService);
export { DocumentsService };
//# sourceMappingURL=documents.service.js.map