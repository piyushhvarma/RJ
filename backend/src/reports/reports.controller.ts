import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { ReportsService } from './reports.service.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

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
