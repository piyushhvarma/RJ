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
    findAll(query?: {
        loanId?: string;
        q?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        items: {
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
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        aggregates: {
            totalAmount: number;
            totalPrincipal: number;
            totalInterest: number;
        };
    } | {
        items: {
            id: string;
            paymentCode: string;
            loanId: string;
            receiptNumber: string;
            amount: number;
            principalComponent: number;
            interestComponent: number;
            penaltyComponent: number;
            otherCharges: number;
            mode: "CASH";
            paymentDate: Date;
            notes: string;
            createdById: string;
            createdAt: Date;
            loan: {
                customer: {
                    id: string;
                    fullName: string;
                    mobile: string;
                    customerCode: string;
                };
                id: string;
                status: import("@prisma/client").$Enums.LoanStatus;
                loanCode: string;
            };
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        aggregates: {
            totalAmount: number;
            totalPrincipal: number;
            totalInterest: number;
        };
    }>;
}
