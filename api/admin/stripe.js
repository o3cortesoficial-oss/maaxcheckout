import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { applyApiSecurityHeaders, cleanString, enforceJsonBodyLimit, rateLimit, requireSameOrigin } from "../_security.js";
import { decryptIntegrationConfig, encryptIntegrationConfig } from "../_integrationSecrets.js";

const provider = "stripe";
const mask = (value) => value ? `${value.slice(0, 7)}••••••••${value.slice(-4)}` : "";

async function requireAdmin(request) {
  const token = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const client = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
  const { data, error } = await client.auth.getUser(token);
  const expected = String(process.env.PLATFORM_ADMIN_EMAIL || "saidlabsglobal@gmail.com").toLowerCase();
  if (error || String(data.user?.email || "").toLowerCase() !== expected)
    throw Object.assign(new Error("Acesso administrativo negado."), { status: 403 });
  return { client, user: data.user };
}

async function testStripe(config) {
  const stripe = new Stripe(config.secret_key);
  const account = await stripe.accounts.retrieve();
  return { account_id: account.id, country: account.country || "", business_name: account.business_profile?.name || account.settings?.dashboard?.display_name || "" };
}

export default async function handler(request, response) {
  applyApiSecurityHeaders(response);
  if (!["GET", "POST"].includes(request.method)) return response.status(405).json({ error: "Método não permitido." });
  if (!requireSameOrigin(request, response) ||
      !rateLimit(request, response, { scope: "admin-stripe", limit: 30, windowMs: 60_000 }) ||
      (request.method === "POST" && !enforceJsonBodyLimit(request, response, 12_000))) return;
  try {
    const { client, user } = await requireAdmin(request);
    const { data: integration, error: readError } = await client.from("platform_integrations").select("*").eq("provider", provider).maybeSingle();
    if (readError) throw readError;
    const saved = integration?.encrypted_config ? decryptIntegrationConfig(integration.encrypted_config) : null;
    if (request.method === "GET") return response.status(200).json({
      configured: Boolean(saved?.secret_key && saved?.publishable_key && saved?.webhook_secret),
      connected: integration?.last_test_status === "success",
      secret_key_hint: mask(saved?.secret_key), publishable_key: saved?.publishable_key || "",
      webhook_secret_hint: mask(saved?.webhook_secret), mode: saved?.mode || "test",
      account_id: saved?.account_id || "", business_name: saved?.business_name || "",
    });

    const secretKey = cleanString(request.body?.secret_key, 256) || saved?.secret_key || "";
    const publishableKey = cleanString(request.body?.publishable_key, 256) || saved?.publishable_key || "";
    const webhookSecret = cleanString(request.body?.webhook_secret, 256) || saved?.webhook_secret || "";
    const mode = secretKey.startsWith("sk_live_") ? "live" : "test";
    if (!/^sk_(test|live)_/.test(secretKey) || !/^pk_(test|live)_/.test(publishableKey) || !webhookSecret.startsWith("whsec_"))
      return response.status(400).json({ error: "Informe as chaves sk_, pk_ e o segredo whsec_ do webhook." });
    if ((secretKey.includes("_live_") !== publishableKey.includes("_live_")))
      return response.status(400).json({ error: "A chave secreta e a publicável precisam estar no mesmo modo." });
    const account = await testStripe({ secret_key: secretKey });
    const config = { secret_key: secretKey, publishable_key: publishableKey, webhook_secret: webhookSecret, mode, ...account };
    const { error } = await client.from("platform_integrations").upsert({
      provider, display_name: "Stripe", status: "active", encrypted_config: encryptIntegrationConfig(config),
      configured_by: user.id, last_tested_at: new Date().toISOString(), last_test_status: "success", updated_at: new Date().toISOString(),
    }, { onConflict: "provider" });
    if (error) throw error;
    return response.status(200).json({ saved: true, mode, ...account, secret_key_hint: mask(secretKey), webhook_secret_hint: mask(webhookSecret) });
  } catch (error) {
    return response.status(error.status || 500).json({ error: error.message || "Não foi possível configurar a Stripe." });
  }
}
