const API_URL = "https://api.pagamaster.com";

export function pagamasterConfigured() {
  return Boolean(
    process.env.PAGAMASTER_PUBLIC_KEY && process.env.PAGAMASTER_SECRET_KEY,
  );
}

export async function pagamasterRequest(path, options = {}) {
  if (!pagamasterConfigured())
    throw new Error("Pagamaster credentials are not configured");
  const credentials = Buffer.from(
    `${process.env.PAGAMASTER_PUBLIC_KEY}:${process.env.PAGAMASTER_SECRET_KEY}`,
  ).toString("base64");
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || "Pagamaster request failed");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}
