import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { PacketsService } from './packets.service.js';
import { PacketsController } from './packets.controller.js';

@Module({
  imports: [CommonModule, AuditModule],
  controllers: [PacketsController],
  providers: [PacketsService],
  exports: [PacketsService],
})
export class PacketsModule {}
