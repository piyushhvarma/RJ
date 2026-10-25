import { Module } from '@nestjs/common';
import { AuditService } from './audit.service.js';

import { TelemetryService } from './telemetry.service.js';
import { TelemetryController } from './telemetry.controller.js';

@Module({
  controllers: [TelemetryController],
  providers: [AuditService, TelemetryService],
  exports: [AuditService, TelemetryService],
})
export class AuditModule {}
