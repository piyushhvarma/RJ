import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface TelemetryEvent {
  id?: string;
  timestamp: string;
  eventType: 'SEARCH' | 'SCROLL' | 'CLICK' | 'PAGE_VIEW' | 'FILTER' | 'DRAFT_AUTOSAVE';
  pageUrl: string;
  userId?: string;
  userEmail?: string;
  book?: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class TelemetryService implements OnModuleInit {
  private readonly logger = new Logger(TelemetryService.name);
  private readonly logDir = path.resolve(process.cwd(), 'data', 'telemetry');
  private readonly recentEvents: TelemetryEvent[] = [];
  private readonly MAX_RECENT = 1000;

  onModuleInit() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * High-throughput recording of user interactions (search, scroll, clicks).
   */
  async recordEvents(events: TelemetryEvent[], ipAddress?: string, userAgent?: string) {
    const today = new Date().toISOString().slice(0, 10);
    const logFilePath = path.join(this.logDir, `telemetry_${today}.jsonl`);

    const enriched = events.map((ev) => ({
      ...ev,
      id: ev.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: ev.timestamp || new Date().toISOString(),
      ipAddress: ipAddress || ev.ipAddress || '127.0.0.1',
      userAgent: userAgent || ev.userAgent || 'Desktop',
    }));

    // 1. Maintain in-memory circular buffer for instant real-time inspection
    for (const ev of enriched) {
      this.recentEvents.push(ev);
      if (this.recentEvents.length > this.MAX_RECENT) {
        this.recentEvents.shift();
      }
    }

    // 2. Append directly to rolling JSONL file
    const lines = enriched.map((ev) => JSON.stringify(ev)).join('\n') + '\n';
    try {
      await fs.promises.appendFile(logFilePath, lines, 'utf8');
    } catch (err) {
      this.logger.error(`Failed to write telemetry log: ${(err as Error).message}`);
    }

    return { recorded: enriched.length };
  }

  getRecentEvents(limit = 100, eventType?: string): TelemetryEvent[] {
    let list = this.recentEvents;
    if (eventType) {
      list = list.filter((e) => e.eventType === eventType);
    }
    return list.slice(-limit).reverse();
  }
}
