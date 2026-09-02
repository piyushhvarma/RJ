import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { BiometricResult } from '@prisma/client';
import { BiometricAdapter, EnrollmentResult, VerificationResult } from './biometric.interface.js';

/**
 * STUB — no physical scanner is wired up yet. This exists so the rest of
 * the application (enrollment flow, closure flow, audit logging, retry/
 * fallback UI) can be built and tested end-to-end against a stable
 * interface today. Swap this for a real vendor adapter (implementing the
 * same BiometricAdapter interface) when hardware is procured — nothing
 * outside this file should need to change (§13.3, §64).
 *
 * Behaviour: enrollment always "succeeds" with a fake template reference.
 * Verification returns MATCH unless the caller passes a templateRef
 * ending in "-fail", which lets tests/demos exercise the NO_MATCH and
 * retry/fallback paths deliberately.
 */
@Injectable()
export class MockBiometricAdapter implements BiometricAdapter {
  private readonly logger = new Logger(MockBiometricAdapter.name);
  private readonly deviceId = 'MOCK-BIO-01';

  async enrollCustomer(customerId: string): Promise<EnrollmentResult> {
    this.logger.warn(
      `[MOCK BIOMETRIC] Enrolling customer ${customerId} — no real device connected.`,
    );
    return {
      success: true,
      templateRef: `mock-template-${randomUUID()}`,
      deviceId: this.deviceId,
      qualityScore: 0.95,
    };
  }

  async verifyCustomer(customerId: string, templateRef: string): Promise<VerificationResult> {
    this.logger.warn(
      `[MOCK BIOMETRIC] Verifying customer ${customerId} — no real device connected.`,
    );
    const result: BiometricResult = templateRef.endsWith('-fail') ? 'NO_MATCH' : 'MATCH';
    return { result, deviceId: this.deviceId };
  }

  async getDeviceStatus() {
    return { deviceId: this.deviceId, online: true };
  }
}
