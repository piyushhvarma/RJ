import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';

export type StorageCategory = 'customers' | 'jewellery' | 'documents' | 'signatures' | 'kyc';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client | null = null;
  private readonly bucketName: string;
  private readonly publicUrl: string;
  private readonly localUploadDir: string;
  private readonly isR2Configured: boolean;

  constructor(private readonly config: ConfigService) {
    const accountId = this.config.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY');
    this.bucketName = this.config.get<string>('R2_BUCKET_NAME', 'gold-loan-erp-photos');
    this.publicUrl = this.config.get<string>('R2_PUBLIC_URL', '').replace(/\/$/, '');
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
    } else {
      this.isR2Configured = false;
      this.logger.warn('Cloudflare R2 credentials not configured. Falling back to local disk storage (/uploads).');
    }
  }

  /**
   * Optimizes images (converts to WebP, resizes to max 1920px, removes metadata)
   * or passes through PDFs/signatures.
   */
  private async optimizeBuffer(
    buffer: Buffer,
    category: StorageCategory,
    originalFilename?: string,
  ): Promise<{ data: Buffer; contentType: string; extension: string }> {
    if (category === 'signatures') {
      // Signatures must retain PNG transparency
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

    // Default for customer & jewellery photos: High quality WebP (~80KB - 120KB)
    const data = await sharp(buffer)
      .rotate() // auto-orient by EXIF
      .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toBuffer();

    return { data, contentType: 'image/webp', extension: 'webp' };
  }

  /**
   * Uploads a file (Buffer or Base64 string) to Cloudflare R2 or local disk.
   * Returns the permanent CDN URL.
   */
  async saveFile(
    input: Buffer | string,
    category: StorageCategory,
    originalFilename?: string,
  ): Promise<string> {
    let rawBuffer: Buffer;

    if (typeof input === 'string') {
      // Decode Base64 dataURL (e.g. data:image/jpeg;base64,...)
      const matches = input.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches) {
        rawBuffer = Buffer.from(matches[2], 'base64');
      } else {
        rawBuffer = Buffer.from(input, 'base64');
      }
    } else {
      rawBuffer = input;
    }

    const { data, contentType, extension } = await this.optimizeBuffer(rawBuffer, category, originalFilename);

    const now = new Date();
    const subFolder = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
    const fileHash = crypto.randomBytes(12).toString('hex');
    const fileName = `${fileHash}.${extension}`;
    const objectKey = `${category}/${subFolder}/${fileName}`;

    if (this.isR2Configured && this.s3Client) {
      // Upload directly to Cloudflare R2
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: objectKey,
          Body: data,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );

      // Return public URL or R2 dev URL
      if (this.publicUrl) {
        return `${this.publicUrl}/${objectKey}`;
      }
      return `https://${this.bucketName}.${this.config.get<string>('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com/${objectKey}`;
    }

    // Local Disk Fallback
    const targetDir = path.join(this.localUploadDir, category, subFolder);
    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(path.join(targetDir, fileName), data);

    const localBaseUrl = this.config.get<string>('LOCAL_STORAGE_BASE_URL', 'http://localhost:3000/uploads');
    return `${localBaseUrl}/${objectKey}`;
  }

  /**
   * Helper that checks if a string is a base64 data URL.
   * If yes, optimizes it, uploads to R2, and returns the CDN URL.
   * If already an HTTP/HTTPS URL, returns it unchanged.
   */
  async normalizeAndStore(
    value: string | undefined | null,
    category: StorageCategory,
    originalFilename?: string,
  ): Promise<string | undefined> {
    if (!value || typeof value !== 'string') return undefined;

    // Already an uploaded HTTP/HTTPS URL or local path
    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/uploads/')) {
      return value;
    }

    // Base64 data URL
    if (value.startsWith('data:image/') || value.startsWith('data:application/')) {
      return this.saveFile(value, category, originalFilename);
    }

    return value;
  }
}
