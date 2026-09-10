import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { IdGeneratorService } from '../common/services/id-generator.service.js';
import { PdfGeneratorService } from './pdf-generator.service.js';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { DocumentType, DocumentStatus } from '@prisma/client';
import crypto from 'crypto';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfGenerator: PdfGeneratorService,
    private readonly audit: AuditService,
    private readonly idGenerator: IdGeneratorService,
  ) {}

  private generateVerificationCode(): string {
    const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `${part1}-${part2}`;
  }

  async getLoanFullDetails(loanId: string) {
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
    if (!loan) throw new NotFoundException(`Loan ${loanId} not found`);
    return loan;
  }

  async findByLoan(loanId: string) {
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

  async getDocumentById(documentId: string) {
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
    if (!doc) throw new NotFoundException(`Document ${documentId} not found`);
    return doc;
  }

  /**
   * Generates or fetches Pledge Agreement PDF
   */
  async getPledgeAgreementPdf(loanId: string, user?: AuthenticatedUser): Promise<{ buffer: Buffer; filename: string }> {
    const loan = await this.getLoanFullDetails(loanId);
    const buffer = await this.pdfGenerator.generatePledgeAgreement(loan);

    // Record document in DB if user is provided
    if (user) {
      await this.recordDocumentGeneration(
        loan.id,
        'PLEDGE_AGREEMENT',
        `pledge-agreement-${loan.loanCode}.pdf`,
        user,
      );
    }

    return {
      buffer,
      filename: `PLEDGE_AGREEMENT_${loan.loanCode}.pdf`,
    };
  }

  /**
   * Generates or fetches Jewellery Annexure PDF
   */
  async getJewelleryAnnexurePdf(loanId: string, user?: AuthenticatedUser): Promise<{ buffer: Buffer; filename: string }> {
    const loan = await this.getLoanFullDetails(loanId);
    const buffer = await this.pdfGenerator.generateJewelleryAnnexure(loan);

    if (user) {
      await this.recordDocumentGeneration(
        loan.id,
        'APPRAISAL_SHEET',
        `jewellery-annexure-${loan.loanCode}.pdf`,
        user,
      );
    }

    return {
      buffer,
      filename: `JEWELLERY_ANNEXURE_${loan.loanCode}.pdf`,
    };
  }

  /**
   * Generates or fetches Payment Receipt PDF
   */
  async getPaymentReceiptPdf(paymentId: string, user?: AuthenticatedUser): Promise<{ buffer: Buffer; filename: string }> {
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
    if (!payment) throw new NotFoundException(`Payment ${paymentId} not found`);

    const buffer = await this.pdfGenerator.generatePaymentReceipt(payment);

    if (user) {
      await this.recordDocumentGeneration(
        payment.loanId,
        'PAYMENT_RECEIPT',
        `receipt-${payment.paymentCode}.pdf`,
        user,
      );
    }

    return {
      buffer,
      filename: `PAYMENT_RECEIPT_${payment.paymentCode}.pdf`,
    };
  }

  /**
   * Generates or fetches Closure / Gold Release Voucher PDF
   */
  async getClosureReceiptPdf(loanId: string, user?: AuthenticatedUser): Promise<{ buffer: Buffer; filename: string }> {
    const loan = await this.getLoanFullDetails(loanId);
    const buffer = await this.pdfGenerator.generateClosureReceipt(loan);

    if (user) {
      await this.recordDocumentGeneration(
        loan.id,
        'CLOSURE',
        `closure-voucher-${loan.loanCode}.pdf`,
        user,
      );
    }

    return {
      buffer,
      filename: `CLOSURE_VOUCHER_${loan.loanCode}.pdf`,
    };
  }

  /**
   * Records a generated document and version in DB
   */
  private async recordDocumentGeneration(
    loanId: string,
    type: DocumentType,
    fileName: string,
    user: AuthenticatedUser,
  ) {
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
      } else {
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

      await this.audit.log(
        {
          entityType: 'Document',
          entityId: doc.id,
          action: 'DOCUMENT_GENERATED',
          userId: user.id,
          roleAtTime: user.role,
          newValue: { type, documentCode: doc.documentCode, currentVersion: doc.currentVersion },
          result: 'SUCCESS',
        },
        tx,
      );

      return doc;
    });
  }

  /**
   * Mark Document as Printed (§40: GENERATED -> PRINTED)
   */
  async markPrinted(documentId: string, user: AuthenticatedUser) {
    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Document not found');

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

  /**
   * Mark Document as Physically Signed (§40: PRINTED -> SIGNED_PHYSICALLY)
   */
  async markSigned(documentId: string, user: AuthenticatedUser) {
    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Document not found');

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
}
