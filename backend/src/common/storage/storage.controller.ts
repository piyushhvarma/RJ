import {
  Controller,
  Post,
  Get,
  UploadedFile,
  UseInterceptors,
  Body,
  Param,
  Res,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import path from 'path';
import fs from 'fs';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { StorageService, StorageCategory } from './storage.service.js';

export interface UploadedFilePayload {
  buffer: Buffer;
  originalname: string;
  mimetype?: string;
  size?: number;
}

@Controller('uploads')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max file size
    }),
  )
  async uploadFile(
    @UploadedFile() file: UploadedFilePayload,
    @Body('category') category: StorageCategory = 'jewellery',
  ) {
    if (!file) throw new BadRequestException('No file provided');

    const url = await this.storageService.saveFile(file.buffer, category, file.originalname);
    return {
      url,
      originalName: file.originalname,
      size: file.size,
    };
  }

  /**
   * Local disk fallback serving endpoint.
   * Only used when Cloudflare R2 credentials are not set in .env.
   */
  @Get(':category/:year/:month/:file')
  serveLocalUpload(
    @Param('category') category: string,
    @Param('year') year: string,
    @Param('month') month: string,
    @Param('file') file: string,
    @Res() res: Response,
  ) {
    // Sanitize to prevent path traversal
    const safeCategory = path.basename(category);
    const safeYear = path.basename(year);
    const safeMonth = path.basename(month);
    const safeFile = path.basename(file);

    const fullPath = path.resolve(
      process.cwd(),
      'uploads',
      safeCategory,
      safeYear,
      safeMonth,
      safeFile,
    );

    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('File not found');
    }

    res.sendFile(fullPath, {
      maxAge: 31536000000, // 1 year cache header
      immutable: true,
    });
  }
}
