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
import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { BiometricService } from './biometric.service.js';
import { VerifyBiometricDto, FallbackBiometricDto } from './dto/verify-biometric.dto.js';
let BiometricController = class BiometricController {
    biometricService;
    constructor(biometricService) {
        this.biometricService = biometricService;
    }
    enroll(customerId, user) {
        return this.biometricService.enroll(customerId, user);
    }
    verify(customerId, dto, user) {
        return this.biometricService.verify(customerId, user, dto.loanId);
    }
    fallback(customerId, dto, user) {
        return this.biometricService.recordFallback(customerId, user, dto.reason, dto.approvedById, dto.loanId);
    }
};
__decorate([
    Post('enroll'),
    Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF),
    __param(0, Param('customerId')),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BiometricController.prototype, "enroll", null);
__decorate([
    Post('verify'),
    Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER),
    __param(0, Param('customerId')),
    __param(1, Body()),
    __param(2, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, VerifyBiometricDto, Object]),
    __metadata("design:returntype", void 0)
], BiometricController.prototype, "verify", null);
__decorate([
    Post('fallback'),
    Roles(UserRole.OWNER, UserRole.MANAGER),
    __param(0, Param('customerId')),
    __param(1, Body()),
    __param(2, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, FallbackBiometricDto, Object]),
    __metadata("design:returntype", void 0)
], BiometricController.prototype, "fallback", null);
BiometricController = __decorate([
    UseGuards(JwtAuthGuard, RolesGuard),
    Controller('customers/:customerId/biometric'),
    __metadata("design:paramtypes", [BiometricService])
], BiometricController);
export { BiometricController };
//# sourceMappingURL=biometric.controller.js.map