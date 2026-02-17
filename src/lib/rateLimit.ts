// ─── BrainBolt Rate Limiter ─────────────────────────────────────────────────
// Simple in-memory sliding window rate limiter.
// Max 30 requests per 60-second window per userId.

// ─── Types ──────────────────────────────────────────────────────────────────

interface RateLimitWindow {
  count: number;
  windowStart: number; // Date.now() timestamp
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;   // requests left in current window
  retryAfter: number;  // seconds until window resets (0 if allowed)
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_REQUESTS = 30;
const WINDOW_MS = 60 * 1000; // 60 seconds

// ─── Store ──────────────────────────────────────────────────────────────────

const windows = new Map<string, RateLimitWindow>();

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Check and consume one request for the given userId.
 * Returns whether the request is allowed and how many remain.
 */
export function checkRateLimit(userId: string): RateLimitResult {
  const now = Date.now();
  const entry = windows.get(userId);

  // New window or expired window → reset
  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    windows.set(userId, { count: 1, windowStart: now });
    return { allowed: true, remaining: MAX_REQUESTS - 1, retryAfter: 0 };
  }

  // Within current window
  if (entry.count < MAX_REQUESTS) {
    entry.count += 1;
    return {
      allowed: true,
      remaining: MAX_REQUESTS - entry.count,
      retryAfter: 0,
    };
  }

  // Rate limited
  const retryAfter = Math.ceil(
    (WINDOW_MS - (now - entry.windowStart)) / 1000
  );
  return { allowed: false, remaining: 0, retryAfter };
}

/**
 * Reset rate limit state (for testing).
 */
export function resetRateLimits(): void {
  windows.clear();
}
