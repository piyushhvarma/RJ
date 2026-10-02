var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { VerificationStatus } from '@prisma/client';
export class SearchCustomersDto {
    q;
    page = 1;
    limit = 25;
    kycStatus;
}
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], SearchCustomersDto.prototype, "q", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt(),
    Min(1),
    __metadata("design:type", Number)
], SearchCustomersDto.prototype, "page", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt(),
    Min(1),
    __metadata("design:type", Number)
], SearchCustomersDto.prototype, "limit", void 0);
__decorate([
    IsOptional(),
    IsEnum(VerificationStatus),
    __metadata("design:type", String)
], SearchCustomersDto.prototype, "kycStatus", void 0);
//# sourceMappingURL=search-customers.dto.js.map