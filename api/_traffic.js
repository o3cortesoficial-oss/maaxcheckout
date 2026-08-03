const BOT_USER_AGENT = /bot\b|crawler|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|discordbot|twitterbot|linkedinbot|pinterest|headlesschrome|phantomjs|selenium|playwright|puppeteer|lighthouse|pagespeed|uptimerobot|statuscake|curl\/|wget\//i;

export function isLikelyAutomated(request) {
  const userAgent = String(request.headers["user-agent"] || "").trim();
  if (!userAgent || BOT_USER_AGENT.test(userAgent)) return true;

  const host = String(
    request.headers["x-forwarded-host"] || request.headers.host || "",
  )
    .split(",")[0]
    .trim()
    .toLowerCase();
  const matchesHost = (value) => {
    if (!value) return false;
    try {
      return new URL(String(value)).host.toLowerCase() === host;
    } catch {
      return false;
    }
  };
  if (
    !host ||
    (!matchesHost(request.headers.origin) && !matchesHost(request.headers.referer))
  )
    return true;

  return false;
}
