var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
let IdGeneratorService = class IdGeneratorService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async next(prefix, tx = this.prisma) {
        const year = new Date().getFullYear();
        const sequence = await tx.idSequence.upsert({
            where: { prefix_year: { prefix, year } },
            create: { prefix, year, lastValue: 1 },
            update: { lastValue: { increment: 1 } },
        });
        const padded = String(sequence.lastValue).padStart(6, '0');
        return `${prefix}-${year}-${padded}`;
    }
    jewelleryItemCode(loanCode, sequenceInLoan) {
        return `${loanCode}-${String(sequenceInLoan).padStart(2, '0')}`;
    }
};
IdGeneratorService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], IdGeneratorService);
export { IdGeneratorService };
//# sourceMappingURL=id-generator.service.js.map