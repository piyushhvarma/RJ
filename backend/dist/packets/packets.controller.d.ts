import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { PacketsService } from './packets.service.js';
import { CreatePacketDto, AssignStorageDto, RetrievePacketDto } from './dto/packet.dto.js';
export declare class PacketsController {
    private readonly packetsService;
    constructor(packetsService: PacketsService);
    create(dto: CreatePacketDto, user: AuthenticatedUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.PacketStatus;
        createdById: string;
        loanId: string;
        releasedAt: Date | null;
        packetCode: string;
        storageLocationId: string | null;
        sealedAt: Date | null;
        storedAt: Date | null;
    }>;
    store(id: string, dto: AssignStorageDto, user: AuthenticatedUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.PacketStatus;
        createdById: string;
        loanId: string;
        releasedAt: Date | null;
        packetCode: string;
        storageLocationId: string | null;
        sealedAt: Date | null;
        storedAt: Date | null;
    }>;
    retrieve(id: string, dto: RetrievePacketDto, user: AuthenticatedUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.PacketStatus;
        createdById: string;
        loanId: string;
        releasedAt: Date | null;
        packetCode: string;
        storageLocationId: string | null;
        sealedAt: Date | null;
        storedAt: Date | null;
    }>;
    release(id: string, user: AuthenticatedUser): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.PacketStatus;
        createdById: string;
        loanId: string;
        releasedAt: Date | null;
        packetCode: string;
        storageLocationId: string | null;
        sealedAt: Date | null;
        storedAt: Date | null;
    }>;
    findAll(q?: string, status?: string, page?: number, limit?: number): Promise<{
        items: ({
            loan: {
                customer: {
                    id: string;
                    fullName: string;
                    mobile: string | null;
                    customerCode: string;
                };
                id: string;
                status: import("@prisma/client").$Enums.LoanStatus;
                _count: {
                    jewelleryItems: number;
                };
                loanCode: string;
                principalAmount: number | null;
            };
            storageLocation: {
                id: string;
                branch: string;
                safe: string;
                locker: string;
                shelf: string;
                position: string;
                label: string;
            } | null;
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import("@prisma/client").$Enums.PacketStatus;
            createdById: string;
            loanId: string;
            releasedAt: Date | null;
            packetCode: string;
            storageLocationId: string | null;
            sealedAt: Date | null;
            storedAt: Date | null;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findOne(id: string): Promise<{
        loan: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            approvedById: string | null;
            status: import("@prisma/client").$Enums.LoanStatus;
            createdById: string;
            customerId: string;
            loanCode: string;
            schemeId: string | null;
            principalAmount: number | null;
            interestRate: number | null;
            interestType: import("@prisma/client").$Enums.InterestType | null;
            processingCharges: number | null;
            otherCharges: number | null;
            sanctionedDate: Date | null;
            maturityDate: Date | null;
            holdReason: import("@prisma/client").$Enums.HoldReason | null;
            holdNotes: string | null;
            legacyPledgeNo: string | null;
        };
        storageLocation: {
            id: string;
            branch: string;
            safe: string;
            locker: string;
            shelf: string;
            position: string;
            label: string;
        } | null;
        movements: {
            id: string;
            reason: string;
            timestamp: Date;
            movedById: string;
            returned: boolean;
            packetId: string;
            fromLocationId: string | null;
            toLocationId: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.PacketStatus;
        createdById: string;
        loanId: string;
        releasedAt: Date | null;
        packetCode: string;
        storageLocationId: string | null;
        sealedAt: Date | null;
        storedAt: Date | null;
    }>;
}
