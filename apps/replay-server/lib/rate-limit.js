import { RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";

const POINTS = 12; // requests allowed
const DURATION_SECONDS = 60; // per window

export const aiEnhanceLimiter = new RateLimiterMemory({
  points: POINTS,
  duration: DURATION_SECONDS,
  keyPrefix: "trail:ai-enhance",
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
