import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { CreateAppraisalDto, ApproveAppraisalDto } from './dto/appraisal.dto.js';
export declare class AppraisalService {
    private readonly prisma;
    private readonly audit;
    constructor(prisma: PrismaService, audit: AuditService);
    create(dto: CreateAppraisalDto, actor: AuthenticatedUser): Promise<{
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
    }>;
    confirm(appraisalId: string, actor: AuthenticatedUser): Promise<{
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
    }>;
    approve(appraisalId: string, dto: ApproveAppraisalDto, actor: AuthenticatedUser): Promise<{
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
    }>;
}
