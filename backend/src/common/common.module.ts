import { Module } from '@nestjs/common';
import { IdGeneratorService } from './services/id-generator.service.js';

@Module({
  providers: [IdGeneratorService],
  exports: [IdGeneratorService],
})
export class CommonModule {}
