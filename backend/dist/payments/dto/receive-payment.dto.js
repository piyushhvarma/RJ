var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';
import { PaymentMode } from '@prisma/client';
export class ReceivePaymentDto {
    loanId;
    amount;
    mode;
    principalComponent;
    interestComponent;
    penaltyComponent;
    otherCharges;
    transactionRef;
    notes;
}
__decorate([
    IsString(),
    __metadata("design:type", String)
], ReceivePaymentDto.prototype, "loanId", void 0);
__decorate([
    IsNumber(),
    IsPositive(),
    __metadata("design:type", Number)
], ReceivePaymentDto.prototype, "amount", void 0);
__decorate([
    IsEnum(PaymentMode),
    __metadata("design:type", String)
], ReceivePaymentDto.prototype, "mode", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(0),
    __metadata("design:type", Number)
], ReceivePaymentDto.prototype, "principalComponent", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(0),
    __metadata("design:type", Number)
], ReceivePaymentDto.prototype, "interestComponent", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(0),
    __metadata("design:type", Number)
], ReceivePaymentDto.prototype, "penaltyComponent", void 0);
__decorate([
    IsOptional(),
    IsNumber(),
    Min(0),
    __metadata("design:type", Number)
], ReceivePaymentDto.prototype, "otherCharges", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], ReceivePaymentDto.prototype, "transactionRef", void 0);
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], ReceivePaymentDto.prototype, "notes", void 0);
//# sourceMappingURL=receive-payment.dto.js.map