/**
 * In-memory rate limiter for API routes.
 * Use per-IP limits to reduce abuse. For multi-instance deploys, use Redis or similar.
 */

const windowMs = 60 * 1000; // 1 minute
const store = new Map<string, { count: number; resetAt: number }>();

function getClientId(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "anonymous"
  );
}

export function checkRateLimit(
  request: Request,
  maxRequests: number
): { ok: true } | { ok: false; retryAfter: number } {
  const id = getClientId(request);
  const now = Date.now();
  let entry = store.get(id);

  if (!entry) {
    store.set(id, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (now >= entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    store.set(id, entry);
    return { ok: true };
  }

  entry.count += 1;
  if (entry.count > maxRequests) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { ok: true };
}
