import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { AppraisalService } from './appraisal.service.js';
import { CreateAppraisalDto, ApproveAppraisalDto } from './dto/appraisal.dto.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('appraisals')
export class AppraisalController {
  constructor(private readonly appraisalService: AppraisalService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.APPRAISER)
  create(@Body() dto: CreateAppraisalDto, @CurrentUser() user: AuthenticatedUser) {
    return this.appraisalService.create(dto, user);
  }

  @Post(':id/confirm')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.APPRAISER)
  confirm(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.appraisalService.confirm(id, user);
  }

  @Post(':id/approve')
  // Approval/locking is manager+ only — appraisers cannot approve their own work.
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveAppraisalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.appraisalService.approve(id, dto, user);
  }
}
