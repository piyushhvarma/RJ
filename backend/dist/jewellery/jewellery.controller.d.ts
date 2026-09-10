import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { JewelleryService } from './jewellery.service.js';
import { CreateJewelleryItemDto } from './dto/create-jewellery-item.dto.js';
import { AddJewelleryPhotoDto } from './dto/add-jewellery-photo.dto.js';
import { ListJewelleryDto } from './dto/list-jewellery.dto.js';
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
        metalType: import("@prisma/client").$Enums.MetalType;
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
    findAllAppraisals(page?: number, limit?: number): Promise<{
        items: ({
            loan: {
                customer: {
                    id: string;
                    fullName: string;
                    customerCode: string;
                };
                id: string;
                status: import("@prisma/client").$Enums.LoanStatus;
                _count: {
                    jewelleryItems: number;
                };
                loanCode: string;
                principalAmount: number | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            approvedById: string | null;
            status: import("@prisma/client").$Enums.AppraisalStatus;
            loanId: string;
            appraiserId: string;
            notes: string | null;
            approvedAt: Date | null;
            goldRateSource: string | null;
            goldRateValue: number | null;
            goldRateAt: Date | null;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findAll(query: ListJewelleryDto): Promise<{
        items: ({
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
            metalType: import("@prisma/client").$Enums.MetalType;
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
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        aggregates: {
            totalGrossWeight: number;
            totalNetWeight: number;
            totalValuation: number;
            gold?: undefined;
            silver?: undefined;
        };
    } | {
        items: ({
            loan: {
                customer: {
                    id: string;
                    fullName: string;
                    mobile: string | null;
                    customerCode: string;
                };
                id: string;
                status: import("@prisma/client").$Enums.LoanStatus;
                loanCode: string;
            };
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
            metalType: import("@prisma/client").$Enums.MetalType;
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
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        aggregates: {
            totalGrossWeight: number;
            totalNetWeight: number;
            totalValuation: number;
            gold: {
                count: number;
                grossWeight: number;
                netWeight: number;
                valuation: number;
            };
            silver: {
                count: number;
                grossWeight: number;
                netWeight: number;
                valuation: number;
            };
        };
    }>;
}
