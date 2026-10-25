'use client';

import { getSession, getActiveBook } from '@/lib/auth/session';
import { API_BASE_URL } from '@/lib/api/client';

export interface TelemetryPayload {
  eventType: 'SEARCH' | 'SCROLL' | 'CLICK' | 'PAGE_VIEW' | 'FILTER' | 'DRAFT_AUTOSAVE';
  pageUrl: string;
  details: Record<string, any>;
  timestamp?: string;
}

class TelemetryTracker {
  private queue: TelemetryPayload[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Flush before unload
      window.addEventListener('beforeunload', () => this.flushImmediate());

      // Auto-flush every 2 seconds
      this.flushTimer = setInterval(() => {
        if (this.queue.length > 0) {
          this.flushImmediate();
        }
      }, 2000);
    }
  }

  track(eventType: TelemetryPayload['eventType'], details: Record<string, any>) {
    if (typeof window === 'undefined') return;

    this.queue.push({
      eventType,
      pageUrl: window.location.pathname + window.location.search,
      details,
      timestamp: new Date().toISOString(),
    });

    if (this.queue.length >= 20) {
      this.flushImmediate();
    }
  }

  trackSearch(query: string, resultsCount?: number) {
    if (!query || query.trim().length === 0) return;
    this.track('SEARCH', { query: query.trim(), resultsCount });
  }

  trackScroll(scrolledDepthPercent: number, targetElement?: string) {
    this.track('SCROLL', { depthPct: Math.round(scrolledDepthPercent), target: targetElement });
  }

  trackClick(elementName: string, meta?: Record<string, any>) {
    this.track('CLICK', { element: elementName, ...meta });
  }

  private flushImmediate() {
    if (this.queue.length === 0) return;
    const batch = [...this.queue];
    this.queue = [];

    const session = getSession();
    const book = getActiveBook();

    const payload = {
      events: batch.map((item) => ({
        ...item,
        userId: session?.user?.id,
        userEmail: (session?.user as any)?.email,
        book,
      })),
    };

    try {
      const url = `${API_BASE_URL}/audit/telemetry`;
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
      } else {
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
      }
    } catch {}
  }
}

export const telemetry = new TelemetryTracker();
