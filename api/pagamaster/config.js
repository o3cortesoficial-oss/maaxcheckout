import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const apiUrl = "https://api.pagamaster.com";

function encryptionKey() {
  const source = process.env.GATEWAY_ENCRYPTION_KEY;
  if (!source) throw new Error("GATEWAY_ENCRYPTION_KEY is not configured");
  return crypto.createHash("sha256").update(source).digest();
}

function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((part) => part.toString("base64url"))
    .join(".");
}

function decrypt(value) {
  const [iv, tag, encrypted] = value
    .split(".")
    .map((part) => Buffer.from(part, "base64url"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
}

async function testConnection(publicKey, secretKey) {
  const credentials = Buffer.from(`${publicKey}:${secretKey}`).toString(
    "base64",
  );
  let result = await fetch(`${apiUrl}/balances`, {
    headers: {
      Authorization: `Basic ${credentials}`,
      Accept: "application/json",
    },
  });
  if (result.status === 401) {
    result = await fetch(`${apiUrl}/balances`, {
      headers: {
        "x-api-key": publicKey,
        "x-api-secret": secretKey,
        Accept: "application/json",
      },
    });
  }
  const payload = await result.json().catch(() => ({}));
  if (!result.ok) {
    const message =
      result.status === 401
        ? "Credenciais inválidas. Confirme a Public Key e a Secret Key geradas em Integrações na Pagamaster."
        : result.status === 403
          ? "Credenciais reconhecidas, mas a conta Pagamaster ainda não possui KYC aprovado."
          : payload.message ||
            payload.error ||
            "A Pagamaster recusou a conexão.";
    const error = new Error(message);
    error.status = result.status;
    throw error;
  }
  return true;
}

function clientFor(request) {
  const token = String(request.headers.authorization || "").replace(
    /^Bearer\s+/i,
    "",
  );
  if (!token)
    throw Object.assign(new Error("Sessão ausente."), { status: 401 });
  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    },
  );
}

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  if (!["GET", "POST"].includes(request.method))
    return response.status(405).json({ error: "Método não permitido." });
  try {
    const supabase = clientFor(request);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user)
      return response.status(401).json({ error: "Sessão inválida." });
    const workspaceId =
      request.method === "GET"
        ? request.query.workspaceId
        : request.body?.workspaceId;
    if (!workspaceId)
      return response.status(400).json({ error: "Workspace não informado." });
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id")
      .eq("id", workspaceId)
      .maybeSingle();
    if (!workspace)
      return response.status(403).json({ error: "Acesso negado." });
    const { data: gateway } = await supabase
      .from("payment_gateways")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("provider", "pagamaster")
      .maybeSingle();

    if (request.method === "GET") {
      return response.status(200).json({
        configured: Boolean(gateway?.credentials_configured),
        active: gateway?.status === "active",
        publicKeyHint:
          gateway?.display_name === "Pagamaster"
            ? gateway?.public_identifier_hint?.split(":", 1)[0] || ""
            : "",
      });
    }

    const action = request.body?.action;
    if (action === "toggle") {
      if (!gateway?.credentials_configured)
        return response
          .status(409)
          .json({ error: "Salve e teste as chaves antes de ativar." });
      const { error } = await supabase
        .from("payment_gateways")
        .update({ status: request.body.active ? "active" : "inactive" })
        .eq("id", gateway.id);
      if (error) throw error;
      return response
        .status(200)
        .json({ active: Boolean(request.body.active) });
    }

    const publicKey = String(request.body?.publicKey || "").trim();
    const secretKey = String(request.body?.secretKey || "").trim();
    if (
      !publicKey.startsWith("pk_live_") ||
      !secretKey.startsWith("sk_live_")
    ) {
      return response
        .status(400)
        .json({ error: "Use as chaves de produção pk_live_ e sk_live_." });
    }
    await testConnection(publicKey, secretKey);
    if (action === "test") return response.status(200).json({ tested: true });
    const encryptedSecret = encrypt(secretKey);
    const record = {
      workspace_id: workspaceId,
      display_name: "Pagamaster",
      provider: "pagamaster",
      environment: "production",
      status: gateway?.status || "inactive",
      credentials_configured: true,
      public_identifier_hint: `${publicKey}:${encryptedSecret}`,
    };
    const operation = gateway
      ? supabase.from("payment_gateways").update(record).eq("id", gateway.id)
      : supabase.from("payment_gateways").insert(record);
    const { error } = await operation;
    if (error) throw error;
    return response.status(200).json({
      configured: true,
      tested: true,
      publicKeyHint: publicKey.slice(0, 12) + "…",
    });
  } catch (error) {
    return response.status(error.status || 500).json({
      error: error.message || "Não foi possível configurar a Pagamaster.",
    });
  }
}
