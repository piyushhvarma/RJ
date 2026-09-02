/**
 * Central fetch wrapper.
 * - Attaches Authorization: Bearer <token> from session
 * - Normalizes NestJS error shape { statusCode, message, error }
 * - On 401 → clears session + redirects to /login
 */

import { getSession, clearSession } from '@/lib/auth/session';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly error?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) {
    // 204 No Content or empty bodies
    const text = await res.text();
    if (!text) return undefined as T;
    return JSON.parse(text) as T;
  }

  // Try to parse the NestJS error envelope
  let body: { statusCode?: number; message?: string; error?: string } = {};
  try {
    body = await res.json();
  } catch {
    // Not JSON
  }

  const message =
    typeof body.message === 'string'
      ? body.message
      : Array.isArray(body.message)
        ? (body.message as string[]).join('; ')
        : `HTTP ${res.status}`;

  if (res.status === 401) {
    clearSession();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  throw new ApiError(res.status, message, body.error);
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const session = getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (session?.accessToken) {
    headers['Authorization'] = `Bearer ${session.accessToken}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  return handleResponse<T>(res);
}
