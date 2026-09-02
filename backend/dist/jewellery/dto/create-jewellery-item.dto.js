var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsBoolean, IsInt, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
export class CreateJewelleryItemDto {
    loanId;
    category;
    description;
    grossWeight;
    stoneWeight;
    purityKarat;
    fineness;
    valuationRate;
    hallmarkDetails;
    identifyingMarks;
    condition;
    ownershipDeclaration;
    appraisalRemarks;
}
__decorate([
    IsString(),
    __metadata("design:type", String)
], CreateJewelleryItemDto.prototype, "loanId", void 0);
__decorate([
    IsString(),
    __metadata("design:type", String)
], CreateJewelleryItemDto.prototype, "category", void 0);
__decorate([
    IsString(),
    __metadata("design:type", String)
], CreateJewelleryItemDto.prototype, "description", void 0);
__decorate([
    IsNumber(),
    IsPositive(),
    __metadata("design:type", Number)
], CreateJewelleryItemDto.prototype, "grossWeight", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(0),
    __metadata("design:type", Number)
], CreateJewelleryItemDto.prototype, "stoneWeight", void 0);
__decorate([
    IsString(),
    __metadata("design:type", String)
], CreateJewelleryItemDto.prototype, "purityKarat", void 0);
__decorate([
    IsOptional(),
    IsInt(),
    __metadata("design:type", Number)
], CreateJewelleryItemDto.prototype, "fineness", void 0);
__decorate([
    IsNumber(),
    IsPositive(),
    __metadata("design:type", Number)
], CreateJewelleryItemDto.prototype, "valuationRate", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateJewelleryItemDto.prototype, "hallmarkDetails", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateJewelleryItemDto.prototype, "identifyingMarks", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateJewelleryItemDto.prototype, "condition", void 0);
__decorate([
    IsOptional(),
    IsBoolean(),
    __metadata("design:type", Boolean)
], CreateJewelleryItemDto.prototype, "ownershipDeclaration", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CreateJewelleryItemDto.prototype, "appraisalRemarks", void 0);
//# sourceMappingURL=create-jewellery-item.dto.js.map