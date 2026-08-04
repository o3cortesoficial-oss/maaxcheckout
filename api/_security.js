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
  response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  response.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  response.setHeader("Vary", "Origin, Sec-Fetch-Site");
}

export function requireSameOrigin(request, response) {
  const origin = String(request.headers.origin || "").trim();
  const referer = String(request.headers.referer || "").trim();
  const host = requestHost(request);
  const fetchSite = String(request.headers["sec-fetch-site"] || "").toLowerCase();
  if (fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite)) {
    response.status(403).json({ error: "Origem da requisição não autorizada." });
    return false;
  }
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

export async function readLimitedBody(request, maxBytes = 32768) {
  if (Buffer.isBuffer(request.body)) {
    if (request.body.length > maxBytes) throw Object.assign(new Error("Payload too large"), { status: 413 });
    return request.body;
  }
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > maxBytes) throw Object.assign(new Error("Payload too large"), { status: 413 });
    chunks.push(buffer);
  }
  return Buffer.concat(chunks);
}

export function safeServerError(response, error, fallback) {
  const status = Number(error?.status || 500);
  const publicMessage = status >= 400 && status < 500 ? error.message : fallback;
  return response.status(status).json({ error: publicMessage });
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
    while (buckets.size > 5000) {
      const oldest = buckets.keys().next().value;
      if (!oldest) break;
      buckets.delete(oldest);
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
