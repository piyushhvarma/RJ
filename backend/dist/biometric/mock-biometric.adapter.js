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
    isHardwareConnected() {
        return process.env.BIOMETRIC_DEVICE_ONLINE === 'true';
    }
    async enrollCustomer(customerId) {
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
    async verifyCustomer(customerId, templateRef) {
        if (!this.isHardwareConnected()) {
            this.logger.warn(`Biometric verification failed for ${customerId}: Physical scanner is disconnected.`);
            return { result: 'DEVICE_ERROR', deviceId: 'HARDWARE_DISCONNECTED' };
        }
        const result = templateRef.endsWith('-fail') ? 'NO_MATCH' : 'MATCH';
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
};
MockBiometricAdapter = MockBiometricAdapter_1 = __decorate([
    Injectable()
], MockBiometricAdapter);
export { MockBiometricAdapter };
//# sourceMappingURL=mock-biometric.adapter.js.map