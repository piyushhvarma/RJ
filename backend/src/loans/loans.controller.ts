import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { LoansService } from './loans.service.js';
import { CreateLoanDto } from './dto/create-loan.dto.js';
import { DisburseLoanDto } from './dto/disburse-loan.dto.js';
import { ListLoansDto } from './dto/list-loans.dto.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Get()
  findAll(@Query() query: ListLoansDto) {
    return this.loansService.findAll(query);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  create(@Body() dto: CreateLoanDto, @CurrentUser() user: AuthenticatedUser) {
    return this.loansService.create(dto, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.loansService.findById(id);
  }

  @Post(':id/disburse')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  disburse(
    @Param('id') id: string,
    @Body() dto: DisburseLoanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.loansService.disburse(id, dto, user);
  }
}
