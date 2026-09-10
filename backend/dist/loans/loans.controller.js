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
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { LoansService } from './loans.service.js';
import { CreateLoanDto } from './dto/create-loan.dto.js';
import { DisburseLoanDto } from './dto/disburse-loan.dto.js';
import { ListLoansDto } from './dto/list-loans.dto.js';
let LoansController = class LoansController {
    loansService;
    constructor(loansService) {
        this.loansService = loansService;
    }
    findAll(query) {
        return this.loansService.findAll(query);
    }
    create(dto, user) {
        return this.loansService.create(dto, user);
    }
    findOne(id) {
        return this.loansService.findById(id);
    }
    disburse(id, dto, user) {
        return this.loansService.disburse(id, dto, user);
    }
};
__decorate([
    Get(),
    __param(0, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ListLoansDto]),
    __metadata("design:returntype", void 0)
], LoansController.prototype, "findAll", null);
__decorate([
    Post(),
    Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF),
    __param(0, Body()),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateLoanDto, Object]),
    __metadata("design:returntype", void 0)
], LoansController.prototype, "create", null);
__decorate([
    Get(':id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LoansController.prototype, "findOne", null);
__decorate([
    Post(':id/disburse'),
    Roles(UserRole.OWNER, UserRole.MANAGER),
    __param(0, Param('id')),
    __param(1, Body()),
    __param(2, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, DisburseLoanDto, Object]),
    __metadata("design:returntype", void 0)
], LoansController.prototype, "disburse", null);
LoansController = __decorate([
    UseGuards(JwtAuthGuard, RolesGuard),
    Controller('loans'),
    __metadata("design:paramtypes", [LoansService])
], LoansController);
export { LoansController };
//# sourceMappingURL=loans.controller.js.map