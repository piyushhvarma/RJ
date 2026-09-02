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
import { AppraisalService } from './appraisal.service.js';
import { CreateAppraisalDto, ApproveAppraisalDto } from './dto/appraisal.dto.js';
let AppraisalController = class AppraisalController {
    appraisalService;
    constructor(appraisalService) {
        this.appraisalService = appraisalService;
    }
    create(dto, user) {
        return this.appraisalService.create(dto, user);
    }
    confirm(id, user) {
        return this.appraisalService.confirm(id, user);
    }
    approve(id, dto, user) {
        return this.appraisalService.approve(id, dto, user);
    }
};
__decorate([
    Post(),
    Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.APPRAISER),
    __param(0, Body()),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateAppraisalDto, Object]),
    __metadata("design:returntype", void 0)
], AppraisalController.prototype, "create", null);
__decorate([
    Post(':id/confirm'),
    Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.APPRAISER),
    __param(0, Param('id')),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AppraisalController.prototype, "confirm", null);
__decorate([
    Post(':id/approve'),
    Roles(UserRole.OWNER, UserRole.MANAGER),
    __param(0, Param('id')),
    __param(1, Body()),
    __param(2, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ApproveAppraisalDto, Object]),
    __metadata("design:returntype", void 0)
], AppraisalController.prototype, "approve", null);
AppraisalController = __decorate([
    UseGuards(JwtAuthGuard, RolesGuard),
    Controller('appraisals'),
    __metadata("design:paramtypes", [AppraisalService])
], AppraisalController);
export { AppraisalController };
//# sourceMappingURL=appraisal.controller.js.map