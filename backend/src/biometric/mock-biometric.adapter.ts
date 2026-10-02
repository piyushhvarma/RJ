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

  private isHardwareConnected(): boolean {
    return process.env.BIOMETRIC_DEVICE_ONLINE === 'true';
  }

  async enrollCustomer(customerId: string): Promise<EnrollmentResult> {
    if (!this.isHardwareConnected()) {
      this.logger.warn(`Biometric enrollment blocked for ${customerId}: No physical scanner connected.`);
      return {
        success: false,
        templateRef: '',
        deviceId: 'HARDWARE_DISCONNECTED',
      };
    }
    return {
      success: true,
      templateRef: `mock-template-${randomUUID()}`,
      deviceId: 'MANTRA-MFS100',
      qualityScore: 0.95,
    };
  }

  async verifyCustomer(customerId: string, templateRef: string): Promise<VerificationResult> {
    if (!this.isHardwareConnected()) {
      this.logger.warn(`Biometric verification failed for ${customerId}: Physical scanner is disconnected.`);
      return { result: 'DEVICE_ERROR', deviceId: 'HARDWARE_DISCONNECTED' };
    }
    const result: BiometricResult = templateRef.endsWith('-fail') ? 'NO_MATCH' : 'MATCH';
    return { result, deviceId: 'MANTRA-MFS100' };
  }

  async getDeviceStatus() {
    const online = this.isHardwareConnected();
    return {
      deviceId: online ? 'MANTRA-MFS100' : 'NONE',
      online,
      message: online ? 'Physical optical scanner connected' : 'No physical fingerprint scanner connected to workstation',
    };
  }
}
