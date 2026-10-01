import { Module } from '@nestjs/common';
import { IdGeneratorService } from './services/id-generator.service.js';
import { StorageService } from './storage/storage.service.js';
import { StorageController } from './storage/storage.controller.js';

@Module({
  controllers: [StorageController],
  providers: [IdGeneratorService, StorageService],
  exports: [IdGeneratorService, StorageService],
})
export class CommonModule {}
