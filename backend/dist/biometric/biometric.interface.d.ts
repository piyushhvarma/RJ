import { BiometricResult } from '@prisma/client';
export declare const BIOMETRIC_ADAPTER: unique symbol;
export interface EnrollmentResult {
    success: boolean;
    templateRef: string;
    deviceId: string;
    qualityScore?: number;
}
export interface VerificationResult {
    result: BiometricResult;
    deviceId: string;
}
export interface BiometricAdapter {
    enrollCustomer(customerId: string): Promise<EnrollmentResult>;
    verifyCustomer(customerId: string, templateRef: string): Promise<VerificationResult>;
    getDeviceStatus(): Promise<{
        deviceId: string;
        online: boolean;
    }>;
}
