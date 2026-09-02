import { PrismaService } from '../prisma/prisma.service.js';
import { IdGeneratorService } from '../common/services/id-generator.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { CreatePacketDto, AssignStorageDto, RetrievePacketDto } from './dto/packet.dto.js';
export declare class PacketsService {
    private readonly prisma;
    private readonly ids;
    private readonly audit;
    constructor(prisma: PrismaService, ids: IdGeneratorService, audit: AuditService);
    create(dto: CreatePacketDto, actor: AuthenticatedUser): Promise<{
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
    storeInLocation(packetId: string, dto: AssignStorageDto, actor: AuthenticatedUser): Promise<{
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
    retrieve(packetId: string, dto: RetrievePacketDto, actor: AuthenticatedUser): Promise<{
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
    release(packetId: string, actor: AuthenticatedUser): Promise<{
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
    findById(id: string): Promise<{
        loan: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            approvedById: string | null;
            status: import("@prisma/client").$Enums.LoanStatus;
            createdById: string;
            customerId: string;
            principalAmount: number | null;
            interestRate: number | null;
            interestType: import("@prisma/client").$Enums.InterestType | null;
            processingCharges: number | null;
            maturityDate: Date | null;
            loanCode: string;
            otherCharges: number | null;
            sanctionedDate: Date | null;
            holdReason: import("@prisma/client").$Enums.HoldReason | null;
            holdNotes: string | null;
            schemeId: string | null;
        };
        storageLocation: {
            id: string;
            label: string;
            branch: string;
            safe: string;
            locker: string;
            shelf: string;
            position: string;
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
