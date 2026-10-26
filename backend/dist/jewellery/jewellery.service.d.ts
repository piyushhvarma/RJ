import { PrismaService } from '../prisma/prisma.service.js';
import { IdGeneratorService } from '../common/services/id-generator.service.js';
import { AuditService } from '../audit/audit.service.js';
import { StorageService } from '../common/storage/storage.service.js';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { CreateJewelleryItemDto } from './dto/create-jewellery-item.dto.js';
import { AddJewelleryPhotoDto } from './dto/add-jewellery-photo.dto.js';
import { ListJewelleryDto } from './dto/list-jewellery.dto.js';
export declare class JewelleryService {
    private readonly prisma;
    private readonly ids;
    private readonly audit;
    private readonly storage;
    constructor(prisma: PrismaService, ids: IdGeneratorService, audit: AuditService, storage: StorageService);
    create(dto: CreateJewelleryItemDto, actor: AuthenticatedUser): Promise<{
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
    addPhoto(itemId: string, dto: AddJewelleryPhotoDto, actor: AuthenticatedUser): Promise<{
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
    })[]>;
    findAll(dto: ListJewelleryDto): Promise<{
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
                    customerCode: string;
                    fullName: string;
                    mobile: string | null;
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
    findAllAppraisals(query?: {
        page?: number;
        limit?: number;
    }): Promise<{
        items: ({
            loan: {
                customer: {
                    id: string;
                    customerCode: string;
                    fullName: string;
                };
                id: string;
                status: import("@prisma/client").$Enums.LoanStatus;
                loanCode: string;
                principalAmount: number | null;
                _count: {
                    jewelleryItems: number;
                };
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
}
