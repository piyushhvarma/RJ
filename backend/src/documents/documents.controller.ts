import {
  Controller,
  Get,
  Post,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { DocumentsService } from './documents.service.js';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('loan/:loanId')
  findByLoan(@Param('loanId') loanId: string) {
    return this.documentsService.findByLoan(loanId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('item/:id')
  findById(@Param('id') id: string) {
    return this.documentsService.getDocumentById(id);
  }

  /**
   * PDF Stream: Pledge Agreement
   * Note: Stream endpoint allows browser viewing/printing directly
   */
  @Get('pledge-agreement/:loanId/pdf')
  async getPledgeAgreementPdf(
    @Param('loanId') loanId: string,
    @Res() res: Response,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const { buffer, filename } = await this.documentsService.getPledgeAgreementPdf(loanId, user);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  /**
   * PDF Stream: Jewellery Annexure
   */
  @Get('jewellery-annexure/:loanId/pdf')
  async getJewelleryAnnexurePdf(
    @Param('loanId') loanId: string,
    @Res() res: Response,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const { buffer, filename } = await this.documentsService.getJewelleryAnnexurePdf(loanId, user);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  /**
   * PDF Stream: Payment Receipt
   */
  @Get('payment-receipt/:paymentId/pdf')
  async getPaymentReceiptPdf(
    @Param('paymentId') paymentId: string,
    @Res() res: Response,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const { buffer, filename } = await this.documentsService.getPaymentReceiptPdf(paymentId, user);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  /**
   * PDF Stream: Closure / Gold Release Voucher
   */
  @Get('closure-receipt/:loanId/pdf')
  async getClosureReceiptPdf(
    @Param('loanId') loanId: string,
    @Res() res: Response,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const { buffer, filename } = await this.documentsService.getClosureReceiptPdf(loanId, user);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':id/print')
  markPrinted(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.markPrinted(id, user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post(':id/sign')
  markSigned(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.documentsService.markSigned(id, user);
  }
}
