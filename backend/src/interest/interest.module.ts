import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { InterestService } from './interest.service.js';

@Module({
  imports: [PrismaModule],
  providers: [InterestService],
  exports: [InterestService],
})
export class InterestModule {}
