import { Injectable } from '@nestjs/common';
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

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Writes one audit event. Every privileged mutation across the app should
   * call this — ideally inside the same transaction as the mutation itself,
   * so an action and its audit trail either both commit or both roll back.
   * Accepts an optional Prisma transaction client so callers can pass `tx`.
   */
  async log(
    entry: AuditEntry,
    tx: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return tx.auditLog.create({
      data: {
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        userId: entry.userId,
        roleAtTime: entry.roleAtTime,
        oldValue: entry.oldValue as Prisma.InputJsonValue,
        newValue: entry.newValue as Prisma.InputJsonValue,
        reason: entry.reason,
        approvedById: entry.approvedById,
        ipAddress: entry.ipAddress,
        deviceId: entry.deviceId,
        result: entry.result,
      },
    });
  }

  /** Full chronological timeline for one entity, e.g. a Loan (§74/§94). */
  async timeline(entityType: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { timestamp: 'asc' },
    });
  }
}
