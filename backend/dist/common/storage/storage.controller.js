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
import { Controller, Post, Get, UploadedFile, UseInterceptors, Body, Param, Res, UseGuards, BadRequestException, NotFoundException, } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import path from 'path';
import fs from 'fs';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { StorageService } from './storage.service.js';
let StorageController = class StorageController {
    storageService;
    constructor(storageService) {
        this.storageService = storageService;
    }
    async uploadFile(file, category = 'jewellery') {
        if (!file)
            throw new BadRequestException('No file provided');
        const url = await this.storageService.saveFile(file.buffer, category, file.originalname);
        return {
            url,
            originalName: file.originalname,
            size: file.size,
        };
    }
    serveLocalUpload(category, year, month, file, res) {
        const safeCategory = path.basename(category);
        const safeYear = path.basename(year);
        const safeMonth = path.basename(month);
        const safeFile = path.basename(file);
        const fullPath = path.resolve(process.cwd(), 'uploads', safeCategory, safeYear, safeMonth, safeFile);
        if (!fs.existsSync(fullPath)) {
            throw new NotFoundException('File not found');
        }
        res.sendFile(fullPath, {
            maxAge: 31536000000,
            immutable: true,
        });
    }
};
__decorate([
    UseGuards(JwtAuthGuard),
    Post(),
    UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 15 * 1024 * 1024 },
    })),
    __param(0, UploadedFile()),
    __param(1, Body('category')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], StorageController.prototype, "uploadFile", null);
__decorate([
    Get(':category/:year/:month/:file'),
    __param(0, Param('category')),
    __param(1, Param('year')),
    __param(2, Param('month')),
    __param(3, Param('file')),
    __param(4, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object]),
    __metadata("design:returntype", void 0)
], StorageController.prototype, "serveLocalUpload", null);
StorageController = __decorate([
    Controller('uploads'),
    __metadata("design:paramtypes", [StorageService])
], StorageController);
export { StorageController };
//# sourceMappingURL=storage.controller.js.map