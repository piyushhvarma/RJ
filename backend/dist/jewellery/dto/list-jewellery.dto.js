var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { JewelleryStatus } from '@prisma/client';
export class ListJewelleryDto {
    loanId;
    q;
    category;
    purityKarat;
    status;
    metalType;
    page = 1;
    limit = 20;
    sortBy = 'createdAt';
    sortOrder = 'desc';
}
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], ListJewelleryDto.prototype, "loanId", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], ListJewelleryDto.prototype, "q", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], ListJewelleryDto.prototype, "category", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], ListJewelleryDto.prototype, "purityKarat", void 0);
__decorate([
    IsOptional(),
    IsEnum(JewelleryStatus),
    __metadata("design:type", String)
], ListJewelleryDto.prototype, "status", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], ListJewelleryDto.prototype, "metalType", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt(),
    Min(1),
    __metadata("design:type", Number)
], ListJewelleryDto.prototype, "page", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt(),
    Min(1),
    Max(100),
    __metadata("design:type", Number)
], ListJewelleryDto.prototype, "limit", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], ListJewelleryDto.prototype, "sortBy", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], ListJewelleryDto.prototype, "sortOrder", void 0);
//# sourceMappingURL=list-jewellery.dto.js.map