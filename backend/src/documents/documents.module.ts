import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { CommonModule } from '../common/common.module.js';
import { DocumentsService } from './documents.service.js';
import { PdfGeneratorService } from './pdf-generator.service.js';
import { DocumentsController } from './documents.controller.js';

@Module({
  imports: [PrismaModule, AuditModule, CommonModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, PdfGeneratorService],
  exports: [DocumentsService, PdfGeneratorService],
})
export class DocumentsModule {}
