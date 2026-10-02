import type { Response } from 'express';
import { StorageService, StorageCategory } from './storage.service.js';
export interface UploadedFilePayload {
    buffer: Buffer;
    originalname: string;
    mimetype?: string;
    size?: number;
}
export declare class StorageController {
    private readonly storageService;
    constructor(storageService: StorageService);
    uploadFile(file: UploadedFilePayload, category?: StorageCategory): Promise<{
        url: string;
        originalName: string;
        size: number | undefined;
    }>;
    serveLocalUpload(category: string, year: string, month: string, file: string, res: Response): void;
}
