var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var MockBiometricAdapter_1;
import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
let MockBiometricAdapter = MockBiometricAdapter_1 = class MockBiometricAdapter {
    logger = new Logger(MockBiometricAdapter_1.name);
    deviceId = 'MOCK-BIO-01';
    async enrollCustomer(customerId) {
        this.logger.warn(`[MOCK BIOMETRIC] Enrolling customer ${customerId} — no real device connected.`);
        return {
            success: true,
            templateRef: `mock-template-${randomUUID()}`,
            deviceId: this.deviceId,
            qualityScore: 0.95,
        };
    }
    async verifyCustomer(customerId, templateRef) {
        this.logger.warn(`[MOCK BIOMETRIC] Verifying customer ${customerId} — no real device connected.`);
        const result = templateRef.endsWith('-fail') ? 'NO_MATCH' : 'MATCH';
        return { result, deviceId: this.deviceId };
    }
    async getDeviceStatus() {
        return { deviceId: this.deviceId, online: true };
    }
};
MockBiometricAdapter = MockBiometricAdapter_1 = __decorate([
    Injectable()
], MockBiometricAdapter);
export { MockBiometricAdapter };
//# sourceMappingURL=mock-biometric.adapter.js.map