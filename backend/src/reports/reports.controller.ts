import { Body, Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { ReportsService } from './reports.service.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // Tier 1: Daily Operations
  @Get('daily-operations')
  getDailyOperations(@Query('date') date?: string) {
    return this.reportsService.getDailyOperations(date);
  }

  @Post('daily-cash-reconciliation')
  recordCashReconciliation(
    @Body() dto: { openingCash: number; actualPhysicalCash: number; notes?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.recordDailyCashReconciliation(dto, user);
  }

  @Post('physical-inventory-reconciliation')
  recordPhysicalReconciliation(
    @Body() dto: { actualPhysicalPackets: number; notes?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reportsService.recordPhysicalInventoryReconciliation(dto, user);
  }

  // Tier 2: Financial & Portfolio
  @Get('financial-portfolio')
  getFinancialPortfolio(
    @Query('range') range?: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    return this.reportsService.getFinancialPortfolio({ range, asOfDate });
  }

  // Periodic Cash Flow & Capital Trends (Day / Month / Year)
  @Get('periodic-trends')
  getPeriodicTrends(
    @Query('groupBy') groupBy?: 'day' | 'month' | 'year',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.getPeriodicTrends({
      groupBy: groupBy || 'month',
      startDate,
      endDate,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // Tier 3: Gold/Silver & Custody
  @Get('custody')
  getCustodyReport() {
    return this.reportsService.getCustodyReport();
  }

  // Tier 4: Customers
  @Get('customers')
  getCustomerReport() {
    return this.reportsService.getCustomerReport();
  }

  // Tier 5: Staff Accountability
  @Get('staff-accountability')
  getStaffAccountabilityReport() {
    return this.reportsService.getStaffAccountabilityReport();
  }

  // CSV Export for any Tier
  @Get('export/:reportKey')
  async exportCsv(
    @Param('reportKey') reportKey: string,
    @Res() res: Response,
    @Query('groupBy') groupBy?: 'day' | 'month' | 'year',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const csvContent = await this.reportsService.generateCsv(reportKey, { groupBy, startDate, endDate });
    const filename = `${reportKey}-${groupBy || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csvContent);
  }

  // Backwards compatibility routes
  @Get('portfolio')
  getPortfolioHealth() {
    return this.reportsService.getPortfolioHealth();
  }

  @Get('gold-stock')
  getGoldStockAudit() {
    return this.reportsService.getGoldStockAudit();
  }

  @Get('borrowers')
  getBorrowerAudit() {
    return this.reportsService.getBorrowerAudit();
  }

  @Get('collections')
  getCollectionsSummary() {
    return this.reportsService.getCollectionsSummary();
  }
}
