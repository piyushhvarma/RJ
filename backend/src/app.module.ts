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

@Module({
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
  ],
})
export class AppModule {}
