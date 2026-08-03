import crypto from "node:crypto";

function integrationKey() {
  const source = process.env.GATEWAY_ENCRYPTION_KEY;
  if (!source) throw new Error("GATEWAY_ENCRYPTION_KEY is not configured");
  return crypto.createHash("sha256").update(source).digest();
}

export function encryptIntegrationConfig(config) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", integrationKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(config), "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((part) => part.toString("base64url"))
    .join(".");
}

export function decryptIntegrationConfig(value) {
  const [iv, tag, encrypted] = String(value || "")
    .split(".")
    .map((part) => Buffer.from(part, "base64url"));
  if (!iv?.length || !tag?.length || !encrypted?.length)
    throw new Error("Invalid encrypted integration config");
  const decipher = crypto.createDecipheriv("aes-256-gcm", integrationKey(), iv);
  decipher.setAuthTag(tag);
  return JSON.parse(
    Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8"),
  );
}
