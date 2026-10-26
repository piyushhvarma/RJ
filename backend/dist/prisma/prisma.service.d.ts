import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { BookType } from './book-context.js';
export declare class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger;
    private book1Client;
    private book2Client;
    private book1Path;
    private book2Path;
    private isPendriveBook2;
    constructor();
    private initPaths;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private enableWal;
    getActiveClient(): PrismaClient;
    forBook(book: BookType): PrismaClient;
    getBook1Client(): PrismaClient;
    getBook2Client(): PrismaClient;
    getStorageInfo(): {
        activeBook: BookType;
        book1: {
            label: string;
            path: string;
            sizeBytes: number;
            isRemovable: boolean;
        };
        book2: {
            label: string;
            path: string;
            sizeBytes: number;
            isRemovable: boolean;
        };
    };
}
