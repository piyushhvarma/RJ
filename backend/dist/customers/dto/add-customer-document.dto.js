var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { KycDocType, VerificationStatus } from '@prisma/client';
export class AddCustomerDocumentDto {
    docType;
    docNumber;
    fileUrl;
    issueDate;
    expiryDate;
    verificationStatus;
}
__decorate([
    IsEnum(KycDocType),
    __metadata("design:type", String)
], AddCustomerDocumentDto.prototype, "docType", void 0);
__decorate([
    IsString(),
    __metadata("design:type", String)
], AddCustomerDocumentDto.prototype, "docNumber", void 0);
__decorate([
    IsString(),
    __metadata("design:type", String)
], AddCustomerDocumentDto.prototype, "fileUrl", void 0);
__decorate([
    IsOptional(),
    IsDateString(),
    __metadata("design:type", String)
], AddCustomerDocumentDto.prototype, "issueDate", void 0);
__decorate([
    IsOptional(),
    IsDateString(),
    __metadata("design:type", String)
], AddCustomerDocumentDto.prototype, "expiryDate", void 0);
__decorate([
    IsOptional(),
    IsEnum(VerificationStatus),
    __metadata("design:type", String)
], AddCustomerDocumentDto.prototype, "verificationStatus", void 0);
//# sourceMappingURL=add-customer-document.dto.js.map