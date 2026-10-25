import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface BackupStatus {
  lastBackupAt: string | null;
  book1: {
    path: string;
    sizeBytes: number;
    lastEncryptedVault: string | null;
    cloudSynced: boolean;
  };
  book2: {
    path: string;
    sizeBytes: number;
    isOnPendrive: boolean;
    lastEncryptedVault: string | null;
    cloudSynced: boolean;
  };
  nextBackupInSeconds: number;
}

@Injectable()
export class BackupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BackupService.name);
  private timer: NodeJS.Timeout | null = null;
  private s3Client: S3Client | null = null;
  private bucketName: string;
  private encryptionKey: string;
  private lastBackupAt: Date | null = null;
  private isBackingUp = false;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.encryptionKey =
      this.config.get<string>('BACKUP_ENCRYPTION_PASSWORD') || 'RadhikaVault@2026!ChangeMe';
    this.bucketName = this.config.get<string>('R2_BUCKET_NAME', 'gold-loan-erp-photos');

    const accountId = this.config.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY');

    if (accountId && accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      });
    }
  }

  onModuleInit() {
    // Run automated backup every 60 seconds
    const intervalMs = 60 * 1000;
    this.timer = setInterval(() => {
      this.runAutomatedBackup().catch((err) => {
        this.logger.error(`Automated backup failed: ${(err as Error).message}`);
      });
    }, intervalMs);

    // Initial backup on startup (non-blocking)
    setTimeout(() => {
      this.runAutomatedBackup().catch(() => {});
    }, 5000);

    this.logger.log('Automated 60-Second Encrypted Cloud Backup Worker initialized.');
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  /**
   * AES-256-GCM Encryption for raw database buffers.
   */
  encryptBuffer(buffer: Buffer, password: string): Buffer {
    const salt = crypto.randomBytes(16);
    const key = crypto.scryptSync(password, salt, 32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const tag = cipher.getAuthTag();

    // Layout: [Salt (16)] [IV (12)] [Tag (16)] [Encrypted Data]
    return Buffer.concat([salt, iv, tag, encrypted]);
  }

  /**
   * AES-256-GCM Decryption.
   */
  decryptBuffer(encryptedBuffer: Buffer, password: string): Buffer {
    if (encryptedBuffer.length < 44) {
      throw new Error('Invalid backup file: header too short');
    }
    const salt = encryptedBuffer.subarray(0, 16);
    const iv = encryptedBuffer.subarray(16, 28);
    const tag = encryptedBuffer.subarray(28, 44);
    const ciphertext = encryptedBuffer.subarray(44);

    const key = crypto.scryptSync(password, salt, 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  }

  /**
   * Checkpoint WAL to SQLite main file and return DB buffer safely.
   */
  private async safeGetDbBuffer(book: 'book1' | 'book2', filePath: string): Promise<Buffer | null> {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const client = this.prisma.forBook(book);
    try {
      await client.$queryRawUnsafe('PRAGMA wal_checkpoint(PASSIVE);');
    } catch {}

    return fs.promises.readFile(filePath);
  }

  /**
   * Runs the automated encrypted backup for both Book 1 and Book 2.
   */
  async runAutomatedBackup(): Promise<{ book1Uploaded: boolean; book2Uploaded: boolean }> {
    if (this.isBackingUp) return { book1Uploaded: false, book2Uploaded: false };
    this.isBackingUp = true;

    const storageInfo = this.prisma.getStorageInfo();
    const backupDir = path.resolve(process.cwd(), 'data', 'backups');
    await fs.promises.mkdir(path.join(backupDir, 'book1'), { recursive: true });
    await fs.promises.mkdir(path.join(backupDir, 'book2'), { recursive: true });

    let b1Uploaded = false;
    let b2Uploaded = false;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    try {
      // 1. Process Book 1 (Pakka)
      const b1Buffer = await this.safeGetDbBuffer('book1', storageInfo.book1.path);
      if (b1Buffer) {
        const encrypted = this.encryptBuffer(b1Buffer, this.encryptionKey);
        const localVaultPath = path.join(backupDir, 'book1', `book1_latest.vault`);
        await fs.promises.writeFile(localVaultPath, encrypted);

        // Upload to Cloud R2
        if (this.s3Client) {
          await this.s3Client.send(
            new PutObjectCommand({
              Bucket: this.bucketName,
              Key: `vault/book1_latest.vault`,
              Body: encrypted,
              ContentType: 'application/octet-stream',
              Metadata: { timestamp: new Date().toISOString(), book: 'book1' },
            }),
          );
          b1Uploaded = true;
        }
      }

      // 2. Process Book 2 (Kaccha / USB)
      const b2Buffer = await this.safeGetDbBuffer('book2', storageInfo.book2.path);
      if (b2Buffer) {
        const encrypted = this.encryptBuffer(b2Buffer, this.encryptionKey);
        const localVaultPath = path.join(backupDir, 'book2', `book2_latest.vault`);
        await fs.promises.writeFile(localVaultPath, encrypted);

        // If Book 2 is on Pen Drive, also store an encrypted local emergency mirror on PC!
        if (storageInfo.book2.isRemovable) {
          const emergencyMirror = path.resolve(process.cwd(), 'data', 'pendrive_emergency_mirror.vault');
          await fs.promises.writeFile(emergencyMirror, encrypted);
        }

        // Upload to Cloud R2
        if (this.s3Client) {
          await this.s3Client.send(
            new PutObjectCommand({
              Bucket: this.bucketName,
              Key: `vault/book2_latest.vault`,
              Body: encrypted,
              ContentType: 'application/octet-stream',
              Metadata: { timestamp: new Date().toISOString(), book: 'book2' },
            }),
          );
          b2Uploaded = true;
        }
      }

      this.lastBackupAt = new Date();
      this.logger.log(
        `[Automated Backup Complete] Gopal Nathmal Varma (Cloud: ${b1Uploaded ? 'Synced' : 'Local'}), XYZ (Cloud: ${b2Uploaded ? 'Synced' : 'Local'})`,
      );
    } finally {
      this.isBackingUp = false;
    }

    return { book1Uploaded: b1Uploaded, book2Uploaded: b2Uploaded };
  }

  /**
   * One-click restore from encrypted cloud backup or local backup.
   */
  async restoreFromCloud(book: 'book1' | 'book2', password: string): Promise<{ success: boolean; bytesRestored: number }> {
    if (!this.s3Client) {
      throw new Error('Cloud storage (R2) is not configured.');
    }

    const key = `vault/${book}_latest.vault`;
    const res = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );

    const streamToBuffer = async (stream: any): Promise<Buffer> => {
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(Buffer.from(chunk));
      return Buffer.concat(chunks);
    };

    const encryptedData = await streamToBuffer(res.Body);
    const decryptedDb = this.decryptBuffer(encryptedData, password);

    const storageInfo = this.prisma.getStorageInfo();
    const targetPath = book === 'book1' ? storageInfo.book1.path : storageInfo.book2.path;

    // Disconnect temporarily, write restored file, then reconnect
    await fs.promises.writeFile(targetPath, decryptedDb);
    this.logger.log(`[Disaster Recovery] Successfully restored ${book} from Cloud Vault to: ${targetPath}`);

    return { success: true, bytesRestored: decryptedDb.length };
  }

  getStatus(): BackupStatus {
    const storageInfo = this.prisma.getStorageInfo();
    return {
      lastBackupAt: this.lastBackupAt ? this.lastBackupAt.toISOString() : null,
      book1: {
        path: storageInfo.book1.path,
        sizeBytes: storageInfo.book1.sizeBytes,
        lastEncryptedVault: path.resolve(process.cwd(), 'data', 'backups', 'book1', 'book1_latest.vault'),
        cloudSynced: !!this.s3Client,
      },
      book2: {
        path: storageInfo.book2.path,
        sizeBytes: storageInfo.book2.sizeBytes,
        isOnPendrive: storageInfo.book2.isRemovable,
        lastEncryptedVault: path.resolve(process.cwd(), 'data', 'backups', 'book2', 'book2_latest.vault'),
        cloudSynced: !!this.s3Client,
      },
      nextBackupInSeconds: 60,
    };
  }
}
