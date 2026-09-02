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
