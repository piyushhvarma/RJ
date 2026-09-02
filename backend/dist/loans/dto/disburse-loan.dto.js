var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsEnum, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { InterestType } from '@prisma/client';
export class DisburseLoanDto {
    principalAmount;
    interestRate;
    interestType;
    processingCharges;
    maturityDate;
}
__decorate([
    IsNumber(),
    IsPositive(),
    __metadata("design:type", Number)
], DisburseLoanDto.prototype, "principalAmount", void 0);
__decorate([
    IsNumber(),
    __metadata("design:type", Number)
], DisburseLoanDto.prototype, "interestRate", void 0);
__decorate([
    IsEnum(InterestType),
    __metadata("design:type", String)
], DisburseLoanDto.prototype, "interestType", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    __metadata("design:type", Number)
], DisburseLoanDto.prototype, "processingCharges", void 0);
__decorate([
    IsString(),
    __metadata("design:type", String)
], DisburseLoanDto.prototype, "maturityDate", void 0);
//# sourceMappingURL=disburse-loan.dto.js.map