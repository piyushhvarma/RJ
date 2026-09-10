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
import { Controller, Get, Post, Param, Res, UseGuards, } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { DocumentsService } from './documents.service.js';
let DocumentsController = class DocumentsController {
    documentsService;
    constructor(documentsService) {
        this.documentsService = documentsService;
    }
    findByLoan(loanId) {
        return this.documentsService.findByLoan(loanId);
    }
    findById(id) {
        return this.documentsService.getDocumentById(id);
    }
    async getPledgeAgreementPdf(loanId, res, user) {
        const { buffer, filename } = await this.documentsService.getPledgeAgreementPdf(loanId, user);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${filename}"`,
            'Content-Length': buffer.length,
        });
        res.end(buffer);
    }
    async getJewelleryAnnexurePdf(loanId, res, user) {
        const { buffer, filename } = await this.documentsService.getJewelleryAnnexurePdf(loanId, user);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${filename}"`,
            'Content-Length': buffer.length,
        });
        res.end(buffer);
    }
    async getPaymentReceiptPdf(paymentId, res, user) {
        const { buffer, filename } = await this.documentsService.getPaymentReceiptPdf(paymentId, user);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${filename}"`,
            'Content-Length': buffer.length,
        });
        res.end(buffer);
    }
    async getClosureReceiptPdf(loanId, res, user) {
        const { buffer, filename } = await this.documentsService.getClosureReceiptPdf(loanId, user);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="${filename}"`,
            'Content-Length': buffer.length,
        });
        res.end(buffer);
    }
    markPrinted(id, user) {
        return this.documentsService.markPrinted(id, user);
    }
    markSigned(id, user) {
        return this.documentsService.markSigned(id, user);
    }
};
__decorate([
    UseGuards(JwtAuthGuard, RolesGuard),
    Get('loan/:loanId'),
    __param(0, Param('loanId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "findByLoan", null);
__decorate([
    UseGuards(JwtAuthGuard, RolesGuard),
    Get('item/:id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "findById", null);
__decorate([
    Get('pledge-agreement/:loanId/pdf'),
    __param(0, Param('loanId')),
    __param(1, Res()),
    __param(2, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "getPledgeAgreementPdf", null);
__decorate([
    Get('jewellery-annexure/:loanId/pdf'),
    __param(0, Param('loanId')),
    __param(1, Res()),
    __param(2, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "getJewelleryAnnexurePdf", null);
__decorate([
    Get('payment-receipt/:paymentId/pdf'),
    __param(0, Param('paymentId')),
    __param(1, Res()),
    __param(2, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "getPaymentReceiptPdf", null);
__decorate([
    Get('closure-receipt/:loanId/pdf'),
    __param(0, Param('loanId')),
    __param(1, Res()),
    __param(2, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "getClosureReceiptPdf", null);
__decorate([
    UseGuards(JwtAuthGuard, RolesGuard),
    Post(':id/print'),
    __param(0, Param('id')),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "markPrinted", null);
__decorate([
    UseGuards(JwtAuthGuard, RolesGuard),
    Post(':id/sign'),
    __param(0, Param('id')),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "markSigned", null);
DocumentsController = __decorate([
    Controller('documents'),
    __metadata("design:paramtypes", [DocumentsService])
], DocumentsController);
export { DocumentsController };
//# sourceMappingURL=documents.controller.js.map