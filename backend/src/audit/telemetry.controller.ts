import { Controller, Post, Get, Body, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { TelemetryService, TelemetryEvent } from './telemetry.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';

@Controller('audit/telemetry')
export class TelemetryController {
  constructor(private readonly telemetry: TelemetryService) {}

  @Post()
  async ingestEvents(@Body() body: { events: TelemetryEvent[] }, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress;
    const ua = req.headers['user-agent'];
    const events = Array.isArray(body?.events) ? body.events : [];
    return this.telemetry.recordEvents(events, ip, ua);
  }

  @UseGuards(JwtAuthGuard)
  @Get('live')
  async getLiveFeed(@Query('limit') limit?: string, @Query('type') type?: string) {
    const lim = limit ? parseInt(limit, 10) : 100;
    return this.telemetry.getRecentEvents(lim, type);
  }
}
