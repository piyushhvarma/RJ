'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { telemetry } from '@/lib/telemetry/tracker';

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lastScrollTime = useRef<number>(0);
  const lastSearchQuery = useRef<string>('');

  useEffect(() => {
    // 1. Global Scroll Listener
    const handleScroll = (e: Event) => {
      const now = Date.now();
      if (now - lastScrollTime.current < 1500) return; // throttle every 1.5s
      lastScrollTime.current = now;

      const target = e.target as HTMLElement | Document;
      let scrollTop = 0;
      let scrollHeight = 0;
      let clientHeight = 0;

      if (target === document || target === document.documentElement) {
        scrollTop = window.scrollY;
        scrollHeight = document.documentElement.scrollHeight;
        clientHeight = window.innerHeight;
      } else if (target instanceof HTMLElement) {
        scrollTop = target.scrollTop;
        scrollHeight = target.scrollHeight;
        clientHeight = target.clientHeight;
      }

      if (scrollHeight > clientHeight) {
        const percent = Math.round((scrollTop / (scrollHeight - clientHeight)) * 100);
        telemetry.trackScroll(percent, (target as HTMLElement).tagName || 'WINDOW');
      }
    };

    // 2. Global Search Input Tracker (captures all search box typing)
    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (!target || target.tagName !== 'INPUT') return;

      const isSearch =
        target.type === 'search' ||
        target.name?.toLowerCase().includes('search') ||
        target.name === 'q' ||
        target.placeholder?.toLowerCase().includes('search') ||
        target.placeholder?.toLowerCase().includes('khoje');

      if (isSearch && target.value.trim().length >= 2) {
        if (target.value !== lastSearchQuery.current) {
          lastSearchQuery.current = target.value;
          telemetry.trackSearch(target.value);
        }
      }
    };

    // 3. Global Click Tracker
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const clickable = target.closest('button, a, [role="button"]');
      if (clickable) {
        const text = clickable.textContent?.trim().slice(0, 30) || clickable.getAttribute('aria-label') || 'Button';
        telemetry.trackClick(text, { tagName: clickable.tagName });
      }
    };

    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    window.addEventListener('input', handleInput, { capture: true, passive: true });
    window.addEventListener('click', handleClick, { capture: true, passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
      window.removeEventListener('input', handleInput, { capture: true });
      window.removeEventListener('click', handleClick, { capture: true });
    };
  }, [pathname]);

  return <>{children}</>;
}
