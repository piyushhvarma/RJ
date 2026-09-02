var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { IdGeneratorService } from '../common/services/id-generator.service.js';
import { AuditService } from '../audit/audit.service.js';
import { BIOMETRIC_ADAPTER } from './biometric.interface.js';
const MAX_ATTEMPTS = 3;
let BiometricService = class BiometricService {
    adapter;
    prisma;
    ids;
    audit;
    constructor(adapter, prisma, ids, audit) {
        this.adapter = adapter;
        this.prisma = prisma;
        this.ids = ids;
        this.audit = audit;
    }
    async enroll(customerId, actor) {
        const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
        if (!customer)
            throw new NotFoundException('Customer not found');
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
    async verify(customerId, actor, loanId) {
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
    async recordFallback(customerId, actor, reason, approvedById, loanId) {
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
};
BiometricService = __decorate([
    Injectable(),
    __param(0, Inject(BIOMETRIC_ADAPTER)),
    __metadata("design:paramtypes", [Object, PrismaService,
        IdGeneratorService,
        AuditService])
], BiometricService);
export { BiometricService };
//# sourceMappingURL=biometric.service.js.map