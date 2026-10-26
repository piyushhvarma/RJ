import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { AppraisalService } from './appraisal.service.js';
import { CreateAppraisalDto, ApproveAppraisalDto } from './dto/appraisal.dto.js';
export declare class AppraisalController {
    private readonly appraisalService;
    constructor(appraisalService: AppraisalService);
    create(dto: CreateAppraisalDto, user: AuthenticatedUser): Promise<{
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
    confirm(id: string, user: AuthenticatedUser): Promise<{
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
    approve(id: string, dto: ApproveAppraisalDto, user: AuthenticatedUser): Promise<{
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
