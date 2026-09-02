import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
export interface AuditEntry {
    entityType: string;
    entityId: string;
    action: string;
    userId: string;
    roleAtTime: UserRole;
    oldValue?: unknown;
    newValue?: unknown;
    reason?: string;
    approvedById?: string;
    ipAddress?: string;
    deviceId?: string;
    result: 'SUCCESS' | 'DENIED' | 'ERROR';
}
export declare class AuditService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    log(entry: AuditEntry, tx?: Prisma.TransactionClient | PrismaService): Promise<{
        id: string;
        result: string;
        entityType: string;
        entityId: string;
        action: string;
        roleAtTime: import("@prisma/client").$Enums.UserRole;
        oldValue: Prisma.JsonValue | null;
        newValue: Prisma.JsonValue | null;
        reason: string | null;
        approvedById: string | null;
        ipAddress: string | null;
        deviceId: string | null;
        timestamp: Date;
        userId: string;
    }>;
    timeline(entityType: string, entityId: string): Promise<{
        id: string;
        result: string;
        entityType: string;
        entityId: string;
        action: string;
        roleAtTime: import("@prisma/client").$Enums.UserRole;
        oldValue: Prisma.JsonValue | null;
        newValue: Prisma.JsonValue | null;
        reason: string | null;
        approvedById: string | null;
        ipAddress: string | null;
        deviceId: string | null;
        timestamp: Date;
        userId: string;
    }[]>;
}
