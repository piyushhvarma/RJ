var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var StorageService_1;
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
let StorageService = StorageService_1 = class StorageService {
    config;
    logger = new Logger(StorageService_1.name);
    s3Client = null;
    bucketName;
    publicUrl;
    localUploadDir;
    isR2Configured;
    constructor(config) {
        this.config = config;
        const accountId = this.config.get('R2_ACCOUNT_ID');
        const accessKeyId = this.config.get('R2_ACCESS_KEY_ID');
        const secretAccessKey = this.config.get('R2_SECRET_ACCESS_KEY');
        this.bucketName = this.config.get('R2_BUCKET_NAME', 'gold-loan-erp-photos');
        this.publicUrl = this.config.get('R2_PUBLIC_URL', '').replace(/\/$/, '');
        this.localUploadDir = path.resolve(process.cwd(), 'uploads');
        if (accountId && accessKeyId && secretAccessKey) {
            this.s3Client = new S3Client({
                region: 'auto',
                endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
                credentials: {
                    accessKeyId,
                    secretAccessKey,
                },
            });
            this.isR2Configured = true;
            this.logger.log(`Cloudflare R2 Object Storage active (Bucket: ${this.bucketName})`);
        }
        else {
            this.isR2Configured = false;
            this.logger.warn('Cloudflare R2 credentials not configured. Falling back to local disk storage (/uploads).');
        }
    }
    async optimizeBuffer(buffer, category, originalFilename) {
        if (category === 'signatures') {
            const data = await sharp(buffer)
                .png({ quality: 90, compressionLevel: 8 })
                .toBuffer();
            return { data, contentType: 'image/png', extension: 'png' };
        }
        if (category === 'documents') {
            const ext = originalFilename ? path.extname(originalFilename).replace('.', '').toLowerCase() : 'pdf';
            const contentType = ext === 'pdf' ? 'application/pdf' : 'application/octet-stream';
            return { data: buffer, contentType, extension: ext };
        }
        const data = await sharp(buffer)
            .rotate()
            .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 80, effort: 4 })
            .toBuffer();
        return { data, contentType: 'image/webp', extension: 'webp' };
    }
    async saveFile(input, category, originalFilename) {
        let rawBuffer;
        if (typeof input === 'string') {
            const matches = input.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches) {
                rawBuffer = Buffer.from(matches[2], 'base64');
            }
            else {
                rawBuffer = Buffer.from(input, 'base64');
            }
        }
        else {
            rawBuffer = input;
        }
        const { data, contentType, extension } = await this.optimizeBuffer(rawBuffer, category, originalFilename);
        const now = new Date();
        const subFolder = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
        const fileHash = crypto.randomBytes(12).toString('hex');
        const fileName = `${fileHash}.${extension}`;
        const objectKey = `${category}/${subFolder}/${fileName}`;
        if (this.isR2Configured && this.s3Client) {
            await this.s3Client.send(new PutObjectCommand({
                Bucket: this.bucketName,
                Key: objectKey,
                Body: data,
                ContentType: contentType,
                CacheControl: 'public, max-age=31536000, immutable',
            }));
            if (this.publicUrl) {
                return `${this.publicUrl}/${objectKey}`;
            }
            return `https://${this.bucketName}.${this.config.get('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com/${objectKey}`;
        }
        const targetDir = path.join(this.localUploadDir, category, subFolder);
        await fs.mkdir(targetDir, { recursive: true });
        await fs.writeFile(path.join(targetDir, fileName), data);
        const localBaseUrl = this.config.get('LOCAL_STORAGE_BASE_URL', 'http://localhost:3000/uploads');
        return `${localBaseUrl}/${objectKey}`;
    }
    async normalizeAndStore(value, category, originalFilename) {
        if (!value || typeof value !== 'string')
            return undefined;
        if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/uploads/')) {
            return value;
        }
        if (value.startsWith('data:image/') || value.startsWith('data:application/')) {
            return this.saveFile(value, category, originalFilename);
        }
        return value;
    }
};
StorageService = StorageService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ConfigService])
], StorageService);
export { StorageService };
//# sourceMappingURL=storage.service.js.map