import { PrismaService } from '../prisma/prisma.service.js';
import { IdGeneratorService } from '../common/services/id-generator.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { CreateJewelleryItemDto } from './dto/create-jewellery-item.dto.js';
import { AddJewelleryPhotoDto } from './dto/add-jewellery-photo.dto.js';
export declare class JewelleryService {
    private readonly prisma;
    private readonly ids;
    private readonly audit;
    constructor(prisma: PrismaService, ids: IdGeneratorService, audit: AuditService);
    create(dto: CreateJewelleryItemDto, actor: AuthenticatedUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.JewelleryStatus;
        loanId: string;
        itemCode: string;
        category: string;
        description: string;
        grossWeight: number;
        stoneWeight: number;
        netWeight: number;
        purityKarat: string;
        fineness: number | null;
        valuationRate: number;
        valuation: number;
        hallmarkDetails: string | null;
        identifyingMarks: string | null;
        condition: string | null;
        ownershipDeclaration: boolean;
        appraisalRemarks: string | null;
        releasedAt: Date | null;
    }>;
    addPhoto(itemId: string, dto: AddJewelleryPhotoDto, actor: AuthenticatedUser): Promise<{
        id: string;
        angle: string;
        fileUrl: string;
        capturedById: string;
        capturedAt: Date;
        jewelleryItemId: string;
    }>;
    findByLoan(loanId: string): Promise<({
        photos: {
            id: string;
            angle: string;
            fileUrl: string;
            capturedById: string;
            capturedAt: Date;
            jewelleryItemId: string;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.JewelleryStatus;
        loanId: string;
        itemCode: string;
        category: string;
        description: string;
        grossWeight: number;
        stoneWeight: number;
        netWeight: number;
        purityKarat: string;
        fineness: number | null;
        valuationRate: number;
        valuation: number;
        hallmarkDetails: string | null;
        identifyingMarks: string | null;
        condition: string | null;
        ownershipDeclaration: boolean;
        appraisalRemarks: string | null;
        releasedAt: Date | null;
    })[]>;
}
