import { BiometricAdapter, EnrollmentResult, VerificationResult } from './biometric.interface.js';
export declare class MockBiometricAdapter implements BiometricAdapter {
    private readonly logger;
    private isHardwareConnected;
    enrollCustomer(customerId: string): Promise<EnrollmentResult>;
    verifyCustomer(customerId: string, templateRef: string): Promise<VerificationResult>;
    getDeviceStatus(): Promise<{
        deviceId: string;
        online: boolean;
        message: string;
    }>;
}
