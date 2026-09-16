import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { InterestModule } from '../interest/interest.module.js';
import { LoansService } from './loans.service.js';
import { LoansController } from './loans.controller.js';

@Module({
  imports: [CommonModule, AuditModule, InterestModule],
  controllers: [LoansController],
  providers: [LoansService],
  exports: [LoansService],
})
export class LoansModule {}
