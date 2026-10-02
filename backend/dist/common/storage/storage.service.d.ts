import { ConfigService } from '@nestjs/config';
export type StorageCategory = 'customers' | 'jewellery' | 'documents' | 'signatures' | 'kyc';
export declare class StorageService {
    private readonly config;
    private readonly logger;
    private readonly s3Client;
    private readonly bucketName;
    private readonly publicUrl;
    private readonly localUploadDir;
    private readonly isR2Configured;
    constructor(config: ConfigService);
    private optimizeBuffer;
    saveFile(input: Buffer | string, category: StorageCategory, originalFilename?: string): Promise<string>;
    normalizeAndStore(value: string | undefined | null, category: StorageCategory, originalFilename?: string): Promise<string | undefined>;
}
