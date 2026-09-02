import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { BiometricService } from './biometric.service.js';
import { BiometricController } from './biometric.controller.js';
import { BIOMETRIC_ADAPTER } from './biometric.interface.js';
import { MockBiometricAdapter } from './mock-biometric.adapter.js';

@Module({
  imports: [CommonModule, AuditModule],
  controllers: [BiometricController],
  providers: [
    BiometricService,
    // Swap this line for a real vendor adapter provider when hardware is
    // ready — no other file in this module needs to change.
    { provide: BIOMETRIC_ADAPTER, useClass: MockBiometricAdapter },
  ],
  exports: [BiometricService],
})
export class BiometricModule {}
