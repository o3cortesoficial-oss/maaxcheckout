import crypto from "node:crypto";

const buckets = globalThis.__maaxRateLimitBuckets || new Map();
globalThis.__maaxRateLimitBuckets = buckets;

const clientIp = (request) =>
  String(
    request.headers["x-vercel-forwarded-for"] ||
      request.headers["x-forwarded-for"] ||
      request.socket?.remoteAddress ||
      "unknown",
  )
    .split(",")[0]
    .trim()
    .slice(0, 96);

const requestHost = (request) =>
  String(request.headers["x-forwarded-host"] || request.headers.host || "")
    .split(",")[0]
    .trim()
    .toLowerCase();

export function applyApiSecurityHeaders(response) {
  response.setHeader("Cache-Control", "no-store, max-age=0");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

export function requireSameOrigin(request, response) {
  const origin = String(request.headers.origin || "").trim();
  const referer = String(request.headers.referer || "").trim();
  const host = requestHost(request);
  const valid = [origin, referer].some((value) => {
    if (!value || !host) return false;
    try {
      return new URL(value).host.toLowerCase() === host;
    } catch {
      return false;
    }
  });
  if (valid) return true;
  response.status(403).json({ error: "Origem da requisição não autorizada." });
  return false;
}

export function enforceJsonBodyLimit(request, response, maxBytes = 32768) {
  const contentType = String(request.headers["content-type"] || "").toLowerCase();
  if (!contentType.startsWith("application/json")) {
    response.status(415).json({ error: "Envie os dados em formato JSON." });
    return false;
  }
  const declaredSize = Number(request.headers["content-length"] || 0);
  const measuredSize = Buffer.byteLength(
    typeof request.body === "string"
      ? request.body
      : JSON.stringify(request.body || {}),
    "utf8",
  );
  if (declaredSize > maxBytes || measuredSize > maxBytes) {
    response.status(413).json({ error: "Requisição muito grande." });
    return false;
  }
  return true;
}

export function rateLimit(request, response, options = {}) {
  const limit = Number(options.limit || 30);
  const windowMs = Number(options.windowMs || 60000);
  const scope = String(options.scope || "api");
  const now = Date.now();
  const identity = crypto
    .createHash("sha256")
    .update(`${scope}:${clientIp(request)}`)
    .digest("base64url");
  const current = buckets.get(identity);
  const bucket = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + windowMs }
    : current;
  bucket.count += 1;
  buckets.set(identity, bucket);

  if (buckets.size > 5000) {
    for (const [key, value] of buckets) {
      if (value.resetAt <= now) buckets.delete(key);
    }
  }

  response.setHeader("X-RateLimit-Limit", String(limit));
  response.setHeader(
    "X-RateLimit-Remaining",
    String(Math.max(0, limit - bucket.count)),
  );
  if (bucket.count <= limit) return true;
  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  response.setHeader("Retry-After", String(retryAfter));
  response.status(429).json({ error: "Muitas tentativas. Aguarde e tente novamente." });
  return false;
}

export const cleanString = (value, maxLength = 255) =>
  String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, maxLength);
