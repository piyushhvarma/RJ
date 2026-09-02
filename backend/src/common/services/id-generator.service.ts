import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export type IdPrefix = 'CUS' | 'GL' | 'PAY' | 'DOC' | 'BIO' | 'PKT';

@Injectable()
export class IdGeneratorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Issues the next code for a given prefix/year, e.g. "CUS-2026-000001".
   * Uses an atomic upsert+increment inside the caller's transaction (or a
   * one-off transaction if none is passed) so identifiers are never reused
   * even under concurrent requests (§8).
   */
  async next(prefix: IdPrefix, tx: Pick<PrismaService, 'idSequence'> = this.prisma): Promise<string> {
    const year = new Date().getFullYear();

    const sequence = await tx.idSequence.upsert({
      where: { prefix_year: { prefix, year } },
      create: { prefix, year, lastValue: 1 },
      update: { lastValue: { increment: 1 } },
    });

    const padded = String(sequence.lastValue).padStart(6, '0');
    return `${prefix}-${year}-${padded}`;
  }

  /** Builds a jewellery item code from its parent loan code, e.g. GL-2026-000184-01. */
  jewelleryItemCode(loanCode: string, sequenceInLoan: number): string {
    return `${loanCode}-${String(sequenceInLoan).padStart(2, '0')}`;
  }
}
