import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { BackupService } from './backup.service.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { RolesGuard } from '../guards/roles.guard.js';
import { Roles } from '../decorators/roles.decorator.js';

@Controller('backup')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('OWNER', 'MANAGER')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get('status')
  getStatus() {
    return this.backupService.getStatus();
  }

  @Post('trigger')
  async triggerBackup() {
    return this.backupService.runAutomatedBackup();
  }

  @Post('restore')
  async restoreFromCloud(
    @Body() body: { book: 'book1' | 'book2'; password: string },
  ) {
    if (!body.book || !body.password) {
      return { success: false, message: 'Book and master password are required.' };
    }
    return this.backupService.restoreFromCloud(body.book, body.password);
  }
}
