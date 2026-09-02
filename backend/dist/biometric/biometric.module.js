var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { BiometricService } from './biometric.service.js';
import { BiometricController } from './biometric.controller.js';
import { BIOMETRIC_ADAPTER } from './biometric.interface.js';
import { MockBiometricAdapter } from './mock-biometric.adapter.js';
let BiometricModule = class BiometricModule {
};
BiometricModule = __decorate([
    Module({
        imports: [CommonModule, AuditModule],
        controllers: [BiometricController],
        providers: [
            BiometricService,
            { provide: BIOMETRIC_ADAPTER, useClass: MockBiometricAdapter },
        ],
        exports: [BiometricService],
    })
], BiometricModule);
export { BiometricModule };
//# sourceMappingURL=biometric.module.js.map