import { Module } from '@nestjs/common';
import { IdGeneratorService } from './services/id-generator.service.js';
import { StorageService } from './storage/storage.service.js';
import { StorageController } from './storage/storage.controller.js';

import { BackupService } from './backup/backup.service.js';
import { BackupController } from './backup/backup.controller.js';

@Module({
  controllers: [StorageController, BackupController],
  providers: [IdGeneratorService, StorageService, BackupService],
  exports: [IdGeneratorService, StorageService, BackupService],
})
export class CommonModule {}
