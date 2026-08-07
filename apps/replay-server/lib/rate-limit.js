// Rate limiting for the AI enhance proxy, backed by rate-limiter-flexible.
//
// In-memory: exact on the local twin, per-function-instance (best-effort) on
// Vercel serverless — enough to damp a burst from one client, not a global
// quota. For a hard quota, swap RateLimiterMemory for RateLimiterRedis with a
// REDIS_URL client; the tryConsume contract below stays identical.

import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';

// The review page fires up to three enhancement calls on open (events load,
// repo suggestion, template fetch), so the window must fit a full open plus
// headroom for a repo change without tripping mid-session.
const POINTS = 12; // requests allowed
const DURATION_SECONDS = 60; // per window

export const aiEnhanceLimiter = new RateLimiterMemory({
  points: POINTS,
  duration: DURATION_SECONDS,
  keyPrefix: 'trail:ai-enhance',
});

// consume() rejects with a RateLimiterRes when the limit is hit. Normalize to
// a stable result so route handlers never touch the library directly:
// { ok: true } or { ok: false, retryAfterSecs }. Non-limit errors rethrow.
export async function tryConsume(limiter, key) {
  try {
    await limiter.consume(key);
    return { ok: true };
  } catch (err) {
    if (err instanceof RateLimiterRes) {
      return { ok: false, retryAfterSecs: Math.ceil(err.msBeforeNext / 1000) };
    }
    throw err;
  }
}
