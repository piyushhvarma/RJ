import { BiometricResult } from '@prisma/client';

export const BIOMETRIC_ADAPTER = Symbol('BIOMETRIC_ADAPTER');

export interface EnrollmentResult {
  success: boolean;
  templateRef: string; // opaque vendor reference — never a raw fingerprint image (§13.3)
  deviceId: string;
  qualityScore?: number;
}

export interface VerificationResult {
  result: BiometricResult; // MATCH / NO_MATCH / DEVICE_ERROR
  deviceId: string;
}

/**
 * Vendor-agnostic biometric device contract (§13.3, §64). The application
 * only ever talks to this interface and receives MATCH / NO_MATCH / an
 * opaque template reference — never raw fingerprint images and never a
 * custom matching algorithm implemented in-app. Swapping the physical
 * scanner means writing a new adapter behind this interface, not touching
 * any application code that calls it.
 */
export interface BiometricAdapter {
  enrollCustomer(customerId: string): Promise<EnrollmentResult>;
  verifyCustomer(customerId: string, templateRef: string): Promise<VerificationResult>;
  getDeviceStatus(): Promise<{ deviceId: string; online: boolean }>;
}
