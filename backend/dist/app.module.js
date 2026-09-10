var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AuditModule } from './audit/audit.module.js';
import { CommonModule } from './common/common.module.js';
import { CustomersModule } from './customers/customers.module.js';
import { BiometricModule } from './biometric/biometric.module.js';
import { LoansModule } from './loans/loans.module.js';
import { JewelleryModule } from './jewellery/jewellery.module.js';
import { AppraisalModule } from './appraisal/appraisal.module.js';
import { PacketsModule } from './packets/packets.module.js';
import { PaymentsModule } from './payments/payments.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { ReportsModule } from './reports/reports.module.js';
let AppModule = class AppModule {
};
AppModule = __decorate([
    Module({
        imports: [
            ConfigModule.forRoot({ isGlobal: true }),
            PrismaModule,
            AuthModule,
            AuditModule,
            CommonModule,
            CustomersModule,
            BiometricModule,
            LoansModule,
            JewelleryModule,
            AppraisalModule,
            PacketsModule,
            PaymentsModule,
            DashboardModule,
            ReportsModule,
        ],
    })
], AppModule);
export { AppModule };
//# sourceMappingURL=app.module.js.map