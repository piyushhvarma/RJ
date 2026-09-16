import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { LoansService } from './loans.service.js';
import { InterestService } from '../interest/interest.service.js';
import { CreateLoanDto } from './dto/create-loan.dto.js';
import { DisburseLoanDto } from './dto/disburse-loan.dto.js';
import { ListLoansDto } from './dto/list-loans.dto.js';
import { TopUpLoanDto } from './dto/topup-loan.dto.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('loans')
export class LoansController {
  constructor(
    private readonly loansService: LoansService,
    private readonly interestService: InterestService,
  ) {}

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

  @Get(':id/settlement-quote')
  getSettlementQuote(
    @Param('id') id: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    const targetDate = asOfDate ? new Date(asOfDate) : new Date();
    return this.interestService.calculateSettlementQuote(id, targetDate);
  }

  @Get(':id/allocate-payment')
  allocatePayment(
    @Param('id') id: string,
    @Query('amount') amount: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    const amt = parseFloat(amount) || 0;
    const targetDate = asOfDate ? new Date(asOfDate) : new Date();
    return this.interestService.allocatePayment(id, amt, targetDate);
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

  @Post(':id/topup')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  topupOrRenew(
    @Param('id') id: string,
    @Body() dto: TopUpLoanDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.loansService.topupOrRenew(id, dto, user);
  }
}
