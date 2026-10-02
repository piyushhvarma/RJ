var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Body, Controller, Get, Param, Post, Query, Res, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ReportsService } from './reports.service.js';
let ReportsController = class ReportsController {
    reportsService;
    constructor(reportsService) {
        this.reportsService = reportsService;
    }
    getDailyOperations(date) {
        return this.reportsService.getDailyOperations(date);
    }
    recordCashReconciliation(dto, user) {
        return this.reportsService.recordDailyCashReconciliation(dto, user);
    }
    recordPhysicalReconciliation(dto, user) {
        return this.reportsService.recordPhysicalInventoryReconciliation(dto, user);
    }
    getFinancialPortfolio(range, asOfDate) {
        return this.reportsService.getFinancialPortfolio({ range, asOfDate });
    }
    getPeriodicTrends(groupBy, startDate, endDate, limit) {
        return this.reportsService.getPeriodicTrends({
            groupBy: groupBy || 'month',
            startDate,
            endDate,
            limit: limit ? parseInt(limit, 10) : undefined,
        });
    }
    getCustodyReport() {
        return this.reportsService.getCustodyReport();
    }
    getCustomerReport() {
        return this.reportsService.getCustomerReport();
    }
    getStaffAccountabilityReport() {
        return this.reportsService.getStaffAccountabilityReport();
    }
    async exportCsv(reportKey, res, groupBy, startDate, endDate) {
        const csvContent = await this.reportsService.generateCsv(reportKey, { groupBy, startDate, endDate });
        const filename = `${reportKey}-${groupBy || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(csvContent);
    }
    getPortfolioHealth() {
        return this.reportsService.getPortfolioHealth();
    }
    getGoldStockAudit() {
        return this.reportsService.getGoldStockAudit();
    }
    getBorrowerAudit() {
        return this.reportsService.getBorrowerAudit();
    }
    getCollectionsSummary() {
        return this.reportsService.getCollectionsSummary();
    }
};
__decorate([
    Get('daily-operations'),
    __param(0, Query('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getDailyOperations", null);
__decorate([
    Post('daily-cash-reconciliation'),
    __param(0, Body()),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "recordCashReconciliation", null);
__decorate([
    Post('physical-inventory-reconciliation'),
    __param(0, Body()),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "recordPhysicalReconciliation", null);
__decorate([
    Get('financial-portfolio'),
    __param(0, Query('range')),
    __param(1, Query('asOfDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getFinancialPortfolio", null);
__decorate([
    Get('periodic-trends'),
    __param(0, Query('groupBy')),
    __param(1, Query('startDate')),
    __param(2, Query('endDate')),
    __param(3, Query('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getPeriodicTrends", null);
__decorate([
    Get('custody'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getCustodyReport", null);
__decorate([
    Get('customers'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getCustomerReport", null);
__decorate([
    Get('staff-accountability'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getStaffAccountabilityReport", null);
__decorate([
    Get('export/:reportKey'),
    __param(0, Param('reportKey')),
    __param(1, Res()),
    __param(2, Query('groupBy')),
    __param(3, Query('startDate')),
    __param(4, Query('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String, String]),
    __metadata("design:returntype", Promise)
], ReportsController.prototype, "exportCsv", null);
__decorate([
    Get('portfolio'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getPortfolioHealth", null);
__decorate([
    Get('gold-stock'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getGoldStockAudit", null);
__decorate([
    Get('borrowers'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getBorrowerAudit", null);
__decorate([
    Get('collections'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "getCollectionsSummary", null);
ReportsController = __decorate([
    UseGuards(JwtAuthGuard, RolesGuard),
    Controller('reports'),
    __metadata("design:paramtypes", [ReportsService])
], ReportsController);
export { ReportsController };
//# sourceMappingURL=reports.controller.js.map