import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { PaymentsService } from './payments.service.js';
import { ReceivePaymentDto } from './dto/receive-payment.dto.js';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    receive(dto: ReceivePaymentDto, user: AuthenticatedUser): Promise<{
        id: string;
        createdAt: Date;
        mode: import("@prisma/client").$Enums.PaymentMode;
        otherCharges: number;
        loanId: string;
        lifecycle: import("@prisma/client").$Enums.RecordLifecycle;
        paymentDate: Date;
        amount: number;
        paymentCode: string;
        principalComponent: number;
        interestComponent: number;
        penaltyComponent: number;
        cashierId: string;
        receiptNumber: string;
        transactionRef: string | null;
        notes: string | null;
    }>;
    findAll(loanId?: string, q?: string, page?: number, limit?: number): Promise<{
        items: {
            id: string;
            createdAt: Date;
            mode: import("@prisma/client").$Enums.PaymentMode;
            otherCharges: number;
            loanId: string;
            lifecycle: import("@prisma/client").$Enums.RecordLifecycle;
            paymentDate: Date;
            amount: number;
            paymentCode: string;
            principalComponent: number;
            interestComponent: number;
            penaltyComponent: number;
            cashierId: string;
            receiptNumber: string;
            transactionRef: string | null;
            notes: string | null;
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
                    mobile: string | null;
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
