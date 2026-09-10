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
import { PacketsService } from './packets.service.js';
import { CreatePacketDto, AssignStorageDto, RetrievePacketDto } from './dto/packet.dto.js';
let PacketsController = class PacketsController {
    packetsService;
    constructor(packetsService) {
        this.packetsService = packetsService;
    }
    create(dto, user) {
        return this.packetsService.create(dto, user);
    }
    store(id, dto, user) {
        return this.packetsService.storeInLocation(id, dto, user);
    }
    retrieve(id, dto, user) {
        return this.packetsService.retrieve(id, dto, user);
    }
    release(id, user) {
        return this.packetsService.release(id, user);
    }
    findAll(q, status, page, limit) {
        return this.packetsService.findAll({ q, status, page, limit });
    }
    findOne(id) {
        return this.packetsService.findById(id);
    }
};
__decorate([
    Post(),
    Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF),
    __param(0, Body()),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreatePacketDto, Object]),
    __metadata("design:returntype", void 0)
], PacketsController.prototype, "create", null);
__decorate([
    Post(':id/store'),
    Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF),
    __param(0, Param('id')),
    __param(1, Body()),
    __param(2, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, AssignStorageDto, Object]),
    __metadata("design:returntype", void 0)
], PacketsController.prototype, "store", null);
__decorate([
    Post(':id/retrieve'),
    Roles(UserRole.OWNER, UserRole.MANAGER),
    __param(0, Param('id')),
    __param(1, Body()),
    __param(2, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, RetrievePacketDto, Object]),
    __metadata("design:returntype", void 0)
], PacketsController.prototype, "retrieve", null);
__decorate([
    Post(':id/release'),
    Roles(UserRole.OWNER, UserRole.MANAGER),
    __param(0, Param('id')),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PacketsController.prototype, "release", null);
__decorate([
    Get(),
    __param(0, Query('q')),
    __param(1, Query('status')),
    __param(2, Query('page')),
    __param(3, Query('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, Number]),
    __metadata("design:returntype", void 0)
], PacketsController.prototype, "findAll", null);
__decorate([
    Get(':id'),
    __param(0, Param('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PacketsController.prototype, "findOne", null);
PacketsController = __decorate([
    UseGuards(JwtAuthGuard, RolesGuard),
    Controller('packets'),
    __metadata("design:paramtypes", [PacketsService])
], PacketsController);
export { PacketsController };
//# sourceMappingURL=packets.controller.js.map