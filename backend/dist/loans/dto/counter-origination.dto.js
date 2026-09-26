var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsArray, IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsPositive, IsString, Min, ValidateNested, } from 'class-validator';
import { Type } from 'class-transformer';
import { InterestType, MetalType, PaymentMode } from '@prisma/client';
export class CounterJewelleryItemDto {
    metalType;
    category;
    description;
    quantity;
    grossWeight;
    stoneWeight;
    netWeight;
    purityKarat;
    fineness;
    valuationRate;
    valuation;
    photos;
}
__decorate([
    IsEnum(MetalType),
    __metadata("design:type", String)
], CounterJewelleryItemDto.prototype, "metalType", void 0);
__decorate([
    IsString(),
    __metadata("design:type", String)
], CounterJewelleryItemDto.prototype, "category", void 0);
__decorate([
    IsString(),
    __metadata("design:type", String)
], CounterJewelleryItemDto.prototype, "description", void 0);
__decorate([
    IsNumber(),
    Min(1),
    __metadata("design:type", Number)
], CounterJewelleryItemDto.prototype, "quantity", void 0);
__decorate([
    IsNumber(),
    IsPositive(),
    __metadata("design:type", Number)
], CounterJewelleryItemDto.prototype, "grossWeight", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(0),
    __metadata("design:type", Number)
], CounterJewelleryItemDto.prototype, "stoneWeight", void 0);
__decorate([
    IsNumber(),
    IsPositive(),
    __metadata("design:type", Number)
], CounterJewelleryItemDto.prototype, "netWeight", void 0);
__decorate([
    IsString(),
    __metadata("design:type", String)
], CounterJewelleryItemDto.prototype, "purityKarat", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    __metadata("design:type", Number)
], CounterJewelleryItemDto.prototype, "fineness", void 0);
__decorate([
    IsNumber(),
    Min(0),
    __metadata("design:type", Number)
], CounterJewelleryItemDto.prototype, "valuationRate", void 0);
__decorate([
    IsNumber(),
    Min(0),
    __metadata("design:type", Number)
], CounterJewelleryItemDto.prototype, "valuation", void 0);
__decorate([
    IsOptional(),
    IsArray(),
    IsString({ each: true }),
    __metadata("design:type", Array)
], CounterJewelleryItemDto.prototype, "photos", void 0);
export class CounterOriginationDto {
    customerId;
    customerPhotoUrl;
    customerSignatureUrl;
    principalAmount;
    interestRate;
    interestType;
    sanctionedDate;
    tenureMonths;
    deductFirstMonthInterest;
    storageLocationLabel;
    paymentMode;
    transactionRef;
    notes;
    jewelleryItems;
}
__decorate([
    IsString(),
    __metadata("design:type", String)
], CounterOriginationDto.prototype, "customerId", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CounterOriginationDto.prototype, "customerPhotoUrl", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CounterOriginationDto.prototype, "customerSignatureUrl", void 0);
__decorate([
    IsNumber(),
    IsPositive(),
    __metadata("design:type", Number)
], CounterOriginationDto.prototype, "principalAmount", void 0);
__decorate([
    IsNumber(),
    Min(0),
    __metadata("design:type", Number)
], CounterOriginationDto.prototype, "interestRate", void 0);
__decorate([
    IsOptional(),
    IsEnum(InterestType),
    __metadata("design:type", String)
], CounterOriginationDto.prototype, "interestType", void 0);
__decorate([
    IsOptional(),
    IsDateString(),
    __metadata("design:type", String)
], CounterOriginationDto.prototype, "sanctionedDate", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(1),
    __metadata("design:type", Number)
], CounterOriginationDto.prototype, "tenureMonths", void 0);
__decorate([
    IsOptional(),
    IsBoolean(),
    __metadata("design:type", Boolean)
], CounterOriginationDto.prototype, "deductFirstMonthInterest", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CounterOriginationDto.prototype, "storageLocationLabel", void 0);
__decorate([
    IsOptional(),
    IsEnum(PaymentMode),
    __metadata("design:type", String)
], CounterOriginationDto.prototype, "paymentMode", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CounterOriginationDto.prototype, "transactionRef", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], CounterOriginationDto.prototype, "notes", void 0);
__decorate([
    IsArray(),
    ValidateNested({ each: true }),
    Type(() => CounterJewelleryItemDto),
    __metadata("design:type", Array)
], CounterOriginationDto.prototype, "jewelleryItems", void 0);
//# sourceMappingURL=counter-origination.dto.js.map