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
import { JewelleryService } from './jewellery.service.js';
import { CreateJewelleryItemDto } from './dto/create-jewellery-item.dto.js';
import { AddJewelleryPhotoDto } from './dto/add-jewellery-photo.dto.js';
import { ListJewelleryDto } from './dto/list-jewellery.dto.js';
let JewelleryController = class JewelleryController {
    jewelleryService;
    constructor(jewelleryService) {
        this.jewelleryService = jewelleryService;
    }
    create(dto, user) {
        return this.jewelleryService.create(dto, user);
    }
    addPhoto(id, dto, user) {
        return this.jewelleryService.addPhoto(id, dto, user);
    }
    findAllAppraisals(page, limit) {
        return this.jewelleryService.findAllAppraisals({ page, limit });
    }
    findAll(query) {
        return this.jewelleryService.findAll(query);
    }
};
__decorate([
    Post(),
    Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.APPRAISER),
    __param(0, Body()),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateJewelleryItemDto, Object]),
    __metadata("design:returntype", void 0)
], JewelleryController.prototype, "create", null);
__decorate([
    Post(':id/photos'),
    Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.APPRAISER, UserRole.STAFF),
    __param(0, Param('id')),
    __param(1, Body()),
    __param(2, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, AddJewelleryPhotoDto, Object]),
    __metadata("design:returntype", void 0)
], JewelleryController.prototype, "addPhoto", null);
__decorate([
    Get('appraisals'),
    __param(0, Query('page')),
    __param(1, Query('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], JewelleryController.prototype, "findAllAppraisals", null);
__decorate([
    Get(),
    __param(0, Query()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [ListJewelleryDto]),
    __metadata("design:returntype", void 0)
], JewelleryController.prototype, "findAll", null);
JewelleryController = __decorate([
    UseGuards(JwtAuthGuard, RolesGuard),
    Controller('jewellery'),
    __metadata("design:paramtypes", [JewelleryService])
], JewelleryController);
export { JewelleryController };
//# sourceMappingURL=jewellery.controller.js.map