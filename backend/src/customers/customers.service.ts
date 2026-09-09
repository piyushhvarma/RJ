import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { IdGeneratorService } from '../common/services/id-generator.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { AddCustomerDocumentDto } from './dto/add-customer-document.dto.js';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ids: IdGeneratorService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateCustomerDto, actor: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      const customerCode = await this.ids.next('CUS', tx as any);

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
        const documentCode = await this.ids.next('DOC', tx as any);
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

      await this.audit.log(
        {
          entityType: 'Customer',
          entityId: customer.id,
          action: 'CUSTOMER_REGISTERED',
          userId: actor.id,
          roleAtTime: actor.role,
          newValue: { customerCode, fullName: dto.fullName, mobile: dto.mobile },
          result: 'SUCCESS',
        },
        tx,
      );

      return customer;
    });
  }

  async updatePhoto(id: string, photoUrl: string, actor: AuthenticatedUser) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('Customer not found');

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

  async addDocument(id: string, dto: AddCustomerDocumentDto, actor: AuthenticatedUser) {
    const customer = await this.prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new NotFoundException('Customer not found');

    const documentCode = await this.ids.next('DOC');
    let docNumberMasked = dto.docNumber;
    const clean = dto.docNumber.replace(/\D/g, '');
    if (dto.docType === 'AADHAAR' && clean.length >= 4) {
      docNumberMasked = `XXXX-XXXX-${clean.slice(-4)}`;
    } else if (dto.docType === 'PAN' && dto.docNumber.length >= 4) {
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

  async findById(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        documents: { orderBy: { createdAt: 'desc' } },
        biometric: true,
        loans: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async search(query?: string) {
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
}

