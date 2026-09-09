import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { BiometricService } from './biometric.service.js';
import { VerifyBiometricDto, FallbackBiometricDto } from './dto/verify-biometric.dto.js';
export declare class BiometricController {
    private readonly biometricService;
    constructor(biometricService: BiometricService);
    enroll(customerId: string, user: AuthenticatedUser): Promise<{
        id: string;
        deviceId: string;
        status: import("@prisma/client").$Enums.BiometricStatus;
        customerId: string;
        enrollmentCode: string;
        templateRef: string;
        enrolledById: string;
        enrolledAt: Date;
    }>;
    verify(customerId: string, dto: VerifyBiometricDto, user: AuthenticatedUser): Promise<{
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
    fallback(customerId: string, dto: FallbackBiometricDto, user: AuthenticatedUser): Promise<{
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
