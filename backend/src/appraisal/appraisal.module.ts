import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { AppraisalService } from './appraisal.service.js';
import { AppraisalController } from './appraisal.controller.js';

@Module({
  imports: [AuditModule],
  controllers: [AppraisalController],
  providers: [AppraisalService],
  exports: [AppraisalService],
})
export class AppraisalModule {}
