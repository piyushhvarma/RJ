import { PrismaService } from '../../prisma/prisma.service.js';
export type IdPrefix = 'CUS' | 'GL' | 'PAY' | 'DOC' | 'BIO' | 'PKT';
export declare class IdGeneratorService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    next(prefix: IdPrefix, tx?: Pick<PrismaService, 'idSequence'>): Promise<string>;
    jewelleryItemCode(loanCode: string, sequenceInLoan: number): string;
}
