import { PrismaService } from '../prisma/prisma.service.js';
import { IdGeneratorService } from '../common/services/id-generator.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import type { BiometricAdapter } from './biometric.interface.js';
export declare class BiometricService {
    private readonly adapter;
    private readonly prisma;
    private readonly ids;
    private readonly audit;
    constructor(adapter: BiometricAdapter, prisma: PrismaService, ids: IdGeneratorService, audit: AuditService);
    enroll(customerId: string, actor: AuthenticatedUser): Promise<{
        id: string;
        deviceId: string;
        status: import("@prisma/client").$Enums.BiometricStatus;
        customerId: string;
        enrollmentCode: string;
        templateRef: string;
        enrolledById: string;
        enrolledAt: Date;
    }>;
    verify(customerId: string, actor: AuthenticatedUser, loanId?: string): Promise<{
        attemptsRemaining: number;
        fallbackAvailable: boolean;
        id: string;
        result: import("@prisma/client").$Enums.BiometricResult;
        deviceId: string;
        timestamp: Date;
        customerId: string;
        verifiedById: string;
        attemptNumber: number;
        fallbackUsed: boolean;
        fallbackReason: string | null;
        loanId: string | null;
    }>;
    recordFallback(customerId: string, actor: AuthenticatedUser, reason: string, approvedById: string, loanId?: string): Promise<{
        id: string;
        result: import("@prisma/client").$Enums.BiometricResult;
        deviceId: string;
        timestamp: Date;
        customerId: string;
        verifiedById: string;
        attemptNumber: number;
        fallbackUsed: boolean;
        fallbackReason: string | null;
        loanId: string | null;
    }>;
}
