import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { BiometricService } from './biometric.service.js';
import { VerifyBiometricDto, FallbackBiometricDto } from './dto/verify-biometric.dto.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers/:customerId/biometric')
export class BiometricController {
  constructor(private readonly biometricService: BiometricService) {}

  @Post('enroll')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  enroll(@Param('customerId') customerId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.biometricService.enroll(customerId, user);
  }

  @Post('verify')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  verify(
    @Param('customerId') customerId: string,
    @Body() dto: VerifyBiometricDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.biometricService.verify(customerId, user, dto.loanId);
  }

  @Post('fallback')
  // Fallback is a privileged override — owner/manager only, and always audited.
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  fallback(
    @Param('customerId') customerId: string,
    @Body() dto: FallbackBiometricDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.biometricService.recordFallback(customerId, user, dto.reason, dto.approvedById, dto.loanId);
  }
}
