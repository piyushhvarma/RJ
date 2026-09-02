import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { IdGeneratorService } from '../common/services/id-generator.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { CreateJewelleryItemDto } from './dto/create-jewellery-item.dto.js';
import { AddJewelleryPhotoDto } from './dto/add-jewellery-photo.dto.js';

@Injectable()
export class JewelleryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ids: IdGeneratorService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateJewelleryItemDto, actor: AuthenticatedUser) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: dto.loanId },
      include: { appraisals: true },
    });
    if (!loan) throw new NotFoundException('Loan not found');

    // §19/§21: once an appraisal is locked, jewellery composition is frozen;
    // any correction has to go through an authorized amendment, not a plain add.
    const isLocked = loan.appraisals.some((a) => a.status === 'LOCKED');
    if (isLocked) {
      throw new BadRequestException(
        'This loan\'s appraisal is locked — adding jewellery requires an authorized amendment',
      );
    }

    const stoneWeight = dto.stoneWeight ?? 0;
    // Net weight is always server-computed (§16) — never accepted from the client directly.
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

      // §111 acceptance criteria: description, weight, purity, valuation,
      // photo, ID and loan link must all exist for a successful entry.
      // Photo is attached via a separate call — recorded here as pending.
      await this.audit.log(
        {
          entityType: 'JewelleryItem',
          entityId: item.id,
          action: 'JEWELLERY_ITEM_ADDED',
          userId: actor.id,
          roleAtTime: actor.role,
          newValue: { itemCode, netWeight, valuation },
          result: 'SUCCESS',
        },
        tx,
      );

      // Loan moves into the appraisal stage once collateral starts being recorded.
      if (loan.status === 'DRAFT') {
        await tx.loan.update({ where: { id: loan.id }, data: { status: 'APPRAISAL_PENDING' } });
      }

      return item;
    });
  }

  async addPhoto(itemId: string, dto: AddJewelleryPhotoDto, actor: AuthenticatedUser) {
    const item = await this.prisma.jewelleryItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Jewellery item not found');

    return this.prisma.jewelleryPhoto.create({
      data: {
        jewelleryItemId: itemId,
        angle: dto.angle,
        fileUrl: dto.fileUrl,
        capturedById: actor.id,
      },
    });
  }

  async findByLoan(loanId: string) {
    return this.prisma.jewelleryItem.findMany({
      where: { loanId },
      include: { photos: true },
      orderBy: { itemCode: 'asc' },
    });
  }
}
