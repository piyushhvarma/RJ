import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { IdGeneratorService } from '../common/services/id-generator.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { BIOMETRIC_ADAPTER } from './biometric.interface.js';
import type { BiometricAdapter } from './biometric.interface.js';

const MAX_ATTEMPTS = 3;

@Injectable()
export class BiometricService {
  constructor(
    @Inject(BIOMETRIC_ADAPTER) private readonly adapter: BiometricAdapter,
    private readonly prisma: PrismaService,
    private readonly ids: IdGeneratorService,
    private readonly audit: AuditService,
  ) {}

  async enroll(customerId: string, actor: AuthenticatedUser) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const deviceResult = await this.adapter.enrollCustomer(customerId);
    const enrollmentCode = await this.ids.next('BIO');

    const [enrollment] = await this.prisma.$transaction([
      this.prisma.biometricEnrollment.create({
        data: {
          enrollmentCode,
          customerId,
          deviceId: deviceResult.deviceId,
          templateRef: deviceResult.templateRef,
          status: deviceResult.success ? 'ENROLLED' : 'ENROLLMENT_FAILED',
          enrolledById: actor.id,
        },
      }),
      this.prisma.customer.update({
        where: { id: customerId },
        data: { biometricStatus: deviceResult.success ? 'ENROLLED' : 'ENROLLMENT_FAILED' },
      }),
    ]);

    await this.audit.log({
      entityType: 'Customer',
      entityId: customerId,
      action: 'BIOMETRIC_ENROLLED',
      userId: actor.id,
      roleAtTime: actor.role,
      newValue: { enrollmentCode, deviceId: deviceResult.deviceId },
      result: deviceResult.success ? 'SUCCESS' : 'ERROR',
    });

    return enrollment;
  }

  /**
   * One verification attempt. Callers (e.g. the closure flow) are
   * responsible for looping up to MAX_ATTEMPTS and offering an authorized
   * fallback after that — this method just records one attempt honestly
   * and never silently converts a NO_MATCH into a pass (§13.4, BR-013).
   */
  async verify(customerId: string, actor: AuthenticatedUser, loanId?: string) {
    const enrollment = await this.prisma.biometricEnrollment.findUnique({ where: { customerId } });
    if (!enrollment) {
      throw new NotFoundException('Customer has no biometric enrollment on file');
    }

    const previousAttempts = await this.prisma.biometricVerificationLog.count({
      where: { customerId, loanId: loanId ?? undefined },
    });

    const deviceResult = await this.adapter.verifyCustomer(customerId, enrollment.templateRef);
    const attemptNumber = previousAttempts + 1;

    const log = await this.prisma.biometricVerificationLog.create({
      data: {
        customerId,
        loanId,
        deviceId: deviceResult.deviceId,
        result: deviceResult.result,
        attemptNumber,
        verifiedById: actor.id,
      },
    });

    if (deviceResult.result !== 'MATCH') {
      // Repeated failures must generate an audit event (§13.4).
      await this.audit.log({
        entityType: 'Loan',
        entityId: loanId ?? customerId,
        action: 'BIOMETRIC_VERIFICATION_FAILED',
        userId: actor.id,
        roleAtTime: actor.role,
        newValue: { attemptNumber, result: deviceResult.result },
        result: 'DENIED',
      });
    }

    return {
      ...log,
      attemptsRemaining: Math.max(0, MAX_ATTEMPTS - attemptNumber),
      fallbackAvailable: attemptNumber >= MAX_ATTEMPTS,
    };
  }

  /** Recorded when a manager authorizes proceeding without a biometric match. */
  async recordFallback(
    customerId: string,
    actor: AuthenticatedUser,
    reason: string,
    approvedById: string,
    loanId?: string,
  ) {
    const log = await this.prisma.biometricVerificationLog.create({
      data: {
        customerId,
        loanId,
        deviceId: 'MANUAL_FALLBACK',
        result: 'NO_MATCH',
        attemptNumber: MAX_ATTEMPTS + 1,
        fallbackUsed: true,
        fallbackReason: reason,
        verifiedById: actor.id,
      },
    });

    // Manual biometric override requires authorization and reason — no
    // anonymous override (§91, BR-014).
    await this.audit.log({
      entityType: 'Loan',
      entityId: loanId ?? customerId,
      action: 'BIOMETRIC_FALLBACK_AUTHORIZED',
      userId: actor.id,
      roleAtTime: actor.role,
      reason,
      approvedById,
      result: 'SUCCESS',
    });

    return log;
  }
}
