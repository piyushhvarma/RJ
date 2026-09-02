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
