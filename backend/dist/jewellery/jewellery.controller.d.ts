import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { JewelleryService } from './jewellery.service.js';
import { CreateJewelleryItemDto } from './dto/create-jewellery-item.dto.js';
import { AddJewelleryPhotoDto } from './dto/add-jewellery-photo.dto.js';
export declare class JewelleryController {
    private readonly jewelleryService;
    constructor(jewelleryService: JewelleryService);
    create(dto: CreateJewelleryItemDto, user: AuthenticatedUser): Promise<{
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
    addPhoto(id: string, dto: AddJewelleryPhotoDto, user: AuthenticatedUser): Promise<{
        id: string;
        fileUrl: string;
        jewelleryItemId: string;
        angle: string;
        capturedById: string;
        capturedAt: Date;
    }>;
    findByLoan(loanId: string): Promise<({
        photos: {
            id: string;
            fileUrl: string;
            jewelleryItemId: string;
            angle: string;
            capturedById: string;
            capturedAt: Date;
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
