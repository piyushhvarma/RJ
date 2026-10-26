var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PrismaService_1;
import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getActiveBook } from './book-context.js';
let PrismaService = PrismaService_1 = class PrismaService extends PrismaClient {
    logger = new Logger(PrismaService_1.name);
    book1Client;
    book2Client;
    book1Path;
    book2Path;
    isPendriveBook2 = false;
    constructor() {
        super();
        this.initPaths();
        this.book1Client = new PrismaClient({
            datasources: { db: { url: `file:${this.book1Path}` } },
        });
        this.book2Client = new PrismaClient({
            datasources: { db: { url: `file:${this.book2Path}` } },
        });
        const customMethods = new Set([
            'onModuleInit',
            'onModuleDestroy',
            'enableWal',
            'getActiveClient',
            'forBook',
            'getBook1Client',
            'getBook2Client',
            'getStorageInfo',
            'initPaths',
            'logger',
            'book1Client',
            'book2Client',
            'book1Path',
            'book2Path',
            'isPendriveBook2',
        ]);
        return new Proxy(this, {
            get(target, prop, receiver) {
                if (typeof prop === 'string' && customMethods.has(prop)) {
                    return Reflect.get(target, prop, receiver);
                }
                const activeClient = target.getActiveClient();
                const value = activeClient[prop];
                if (typeof value === 'function') {
                    return value.bind(activeClient);
                }
                return value;
            },
        });
    }
    initPaths() {
        const defaultDataDir = path.resolve(process.cwd(), 'data');
        if (!fs.existsSync(defaultDataDir)) {
            fs.mkdirSync(defaultDataDir, { recursive: true });
        }
        const rawBook1 = process.env.BOOK1_DATABASE_URL || process.env.DATABASE_URL || 'file:./data/book1_pakka.db';
        this.book1Path = rawBook1.replace(/^file:/, '');
        if (!path.isAbsolute(this.book1Path)) {
            this.book1Path = path.resolve(process.cwd(), this.book1Path);
        }
        const pendriveDir = process.env.PENDRIVE_MOUNT_DIR?.trim();
        if (pendriveDir && fs.existsSync(pendriveDir)) {
            this.book2Path = path.resolve(pendriveDir, 'book2_kaccha.db');
            this.isPendriveBook2 = true;
            this.logger.log(`[Storage] Pen Drive detected at: ${pendriveDir}. Routing Book 2 to USB.`);
        }
        else {
            const rawBook2 = process.env.BOOK2_DATABASE_URL || 'file:./data/book2_kaccha.db';
            this.book2Path = rawBook2.replace(/^file:/, '');
            if (!path.isAbsolute(this.book2Path)) {
                this.book2Path = path.resolve(process.cwd(), this.book2Path);
            }
            this.logger.log(`[Storage] Routing Book 2 to local data folder: ${this.book2Path}`);
        }
    }
    async onModuleInit() {
        await this.book1Client.$connect();
        await this.enableWal(this.book1Client, 'Gopal Nathmal Varma (Book 1)');
        try {
            await this.book2Client.$connect();
            await this.enableWal(this.book2Client, 'XYZ (Book 2)');
        }
        catch (err) {
            this.logger.error(`Failed to connect Book 2 database: ${err.message}`);
        }
    }
    async onModuleDestroy() {
        await this.book1Client.$disconnect();
        await this.book2Client.$disconnect();
    }
    async enableWal(client, label) {
        try {
            await client.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
            await client.$queryRawUnsafe('PRAGMA synchronous = NORMAL;');
            this.logger.log(`[WAL Mode Active] Instant disk sync & power-cut protection enabled for ${label}`);
        }
        catch (e) {
            this.logger.warn(`Could not set WAL mode for ${label}: ${e.message}`);
        }
    }
    getActiveClient() {
        const book = getActiveBook();
        return book === 'book2' ? this.book2Client : this.book1Client;
    }
    forBook(book) {
        return book === 'book2' ? this.book2Client : this.book1Client;
    }
    getBook1Client() {
        return this.book1Client;
    }
    getBook2Client() {
        return this.book2Client;
    }
    getStorageInfo() {
        const getFileSize = (filePath) => {
            try {
                if (fs.existsSync(filePath)) {
                    return fs.statSync(filePath).size;
                }
            }
            catch { }
            return 0;
        };
        return {
            activeBook: getActiveBook(),
            book1: {
                label: 'Gopal Nathmal Varma',
                path: this.book1Path,
                sizeBytes: getFileSize(this.book1Path),
                isRemovable: false,
            },
            book2: {
                label: 'XYZ',
                path: this.book2Path,
                sizeBytes: getFileSize(this.book2Path),
                isRemovable: this.isPendriveBook2,
            },
        };
    }
};
PrismaService = PrismaService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [])
], PrismaService);
export { PrismaService };
//# sourceMappingURL=prisma.service.js.map