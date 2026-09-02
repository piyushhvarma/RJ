import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { JewelleryService } from './jewellery.service.js';
import { JewelleryController } from './jewellery.controller.js';

@Module({
  imports: [CommonModule, AuditModule],
  controllers: [JewelleryController],
  providers: [JewelleryService],
  exports: [JewelleryService],
})
export class JewelleryModule {}
