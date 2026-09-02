import { PrismaService } from '../prisma/prisma.service.js';
import { IdGeneratorService } from '../common/services/id-generator.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { ReceivePaymentDto } from './dto/receive-payment.dto.js';
export declare class PaymentsService {
    private readonly prisma;
    private readonly ids;
    private readonly audit;
    constructor(prisma: PrismaService, ids: IdGeneratorService, audit: AuditService);
    outstandingPrincipal(loanId: string): Promise<number>;
    receive(dto: ReceivePaymentDto, actor: AuthenticatedUser): Promise<{
        id: string;
        createdAt: Date;
        mode: import("@prisma/client").$Enums.PaymentMode;
        loanId: string;
        otherCharges: number;
        notes: string | null;
        amount: number;
        principalComponent: number;
        interestComponent: number;
        penaltyComponent: number;
        transactionRef: string | null;
        paymentCode: string;
        paymentDate: Date;
        cashierId: string;
        receiptNumber: string;
        lifecycle: import("@prisma/client").$Enums.RecordLifecycle;
    }>;
    findByLoan(loanId: string): Promise<{
        id: string;
        createdAt: Date;
        mode: import("@prisma/client").$Enums.PaymentMode;
        loanId: string;
        otherCharges: number;
        notes: string | null;
        amount: number;
        principalComponent: number;
        interestComponent: number;
        penaltyComponent: number;
        transactionRef: string | null;
        paymentCode: string;
        paymentDate: Date;
        cashierId: string;
        receiptNumber: string;
        lifecycle: import("@prisma/client").$Enums.RecordLifecycle;
    }[]>;
}
