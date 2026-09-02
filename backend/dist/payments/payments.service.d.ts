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
        otherCharges: number;
        loanId: string;
        notes: string | null;
        amount: number;
        paymentCode: string;
        paymentDate: Date;
        principalComponent: number;
        interestComponent: number;
        penaltyComponent: number;
        cashierId: string;
        receiptNumber: string;
        transactionRef: string | null;
        lifecycle: import("@prisma/client").$Enums.RecordLifecycle;
    }>;
    findByLoan(loanId: string): Promise<{
        id: string;
        createdAt: Date;
        mode: import("@prisma/client").$Enums.PaymentMode;
        otherCharges: number;
        loanId: string;
        notes: string | null;
        amount: number;
        paymentCode: string;
        paymentDate: Date;
        principalComponent: number;
        interestComponent: number;
        penaltyComponent: number;
        cashierId: string;
        receiptNumber: string;
        transactionRef: string | null;
        lifecycle: import("@prisma/client").$Enums.RecordLifecycle;
    }[]>;
}
