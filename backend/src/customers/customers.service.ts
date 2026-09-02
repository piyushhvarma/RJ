import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { IdGeneratorService } from '../common/services/id-generator.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';

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
          createdById: actor.id,
        },
      });

      // Acceptance criteria for customer registration (§110) requires an
      // audit event as part of a successful registration — written in the
      // same transaction so the customer never exists without one.
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

  async findById(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        documents: true,
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
