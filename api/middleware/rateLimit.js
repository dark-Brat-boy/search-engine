// Simple per-tenant rate limiter (in-memory)

const RATE_LIMIT = 100;        // max requests
const WINDOW_MS = 60 * 1000;   // 1 minute

// Map: tenant → { count, windowStart }
const buckets = new Map();

module.exports = function tenantRateLimit(req, res, next) {
  const tenant = req.query.tenant || req.headers["x-tenant-id"];

  if (!tenant) {
    return res.status(400).json({ error: "tenant required for rate limiting" });
  }

  const now = Date.now();
  const bucket = buckets.get(tenant);

  if (!bucket) {
    buckets.set(tenant, { count: 1, windowStart: now });
    return next();
  }

  // Reset window
  if (now - bucket.windowStart > WINDOW_MS) {
    bucket.count = 1;
    bucket.windowStart = now;
    return next();
  }

  // Check limit
  if (bucket.count >= RATE_LIMIT) {
    return res.status(429).json({
      error: "Rate limit exceeded",
      tenant,
      limit: RATE_LIMIT,
      windowSeconds: WINDOW_MS / 1000
    });
  }

  bucket.count++;
  next();
};
