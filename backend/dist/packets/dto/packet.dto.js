var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsOptional, IsString } from 'class-validator';
export class CreatePacketDto {
    loanId;
}
__decorate([
    IsString(),
    __metadata("design:type", String)
], CreatePacketDto.prototype, "loanId", void 0);
export class AssignStorageDto {
    branch;
    safe;
    locker;
    shelf;
    position;
}
__decorate([
    IsOptional(),
    IsString(),
    __metadata("design:type", String)
], AssignStorageDto.prototype, "branch", void 0);
__decorate([
    IsString(),
    __metadata("design:type", String)
], AssignStorageDto.prototype, "safe", void 0);
__decorate([
    IsString(),
    __metadata("design:type", String)
], AssignStorageDto.prototype, "locker", void 0);
__decorate([
    IsString(),
    __metadata("design:type", String)
], AssignStorageDto.prototype, "shelf", void 0);
__decorate([
    IsString(),
    __metadata("design:type", String)
], AssignStorageDto.prototype, "position", void 0);
export class RetrievePacketDto {
    reason;
}
__decorate([
    IsString(),
    __metadata("design:type", String)
], RetrievePacketDto.prototype, "reason", void 0);
//# sourceMappingURL=packet.dto.js.map