import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import {
  applyApiSecurityHeaders,
  cleanString,
  enforceJsonBodyLimit,
  rateLimit,
  requireSameOrigin,
} from "../_security.js";
import {
  decryptIntegrationConfig,
  encryptIntegrationConfig,
} from "../_integrationSecrets.js";

const adminEmail = () =>
  String(process.env.PLATFORM_ADMIN_EMAIL || "saidlabsglobal@gmail.com")
    .trim()
    .toLowerCase();

const maskKey = (key) =>
  key ? `${String(key).slice(0, 3)}••••••••${String(key).slice(-4)}` : "";

async function requireAdmin(request) {
  const token = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) throw Object.assign(new Error("Sessão ausente."), { status: 401 });
  if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY)
    throw Object.assign(new Error("Administração não configurada."), { status: 503 });
  const client = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user || String(data.user.email || "").toLowerCase() !== adminEmail())
    throw Object.assign(new Error("Acesso administrativo negado."), { status: 403 });
  return { client, user: data.user };
}

async function testResend(config) {
  const resend = new Resend(config.api_key);
  const [{ error: domainsError }, { data: template, error: templateError }] =
    await Promise.all([
      resend.domains.list(),
      resend.templates.get(config.template_id),
    ]);
  if (domainsError) throw new Error(domainsError.message || "A chave da Resend foi recusada.");
  if (templateError) throw new Error(templateError.message || "O template não foi encontrado.");
  if (template?.status !== "published")
    throw new Error("O template existe, mas ainda não está publicado na Resend.");
  return true;
}

export default async function handler(request, response) {
  applyApiSecurityHeaders(response);
  if (!["GET", "POST"].includes(request.method))
    return response.status(405).json({ error: "Método não permitido." });
  if (
    !requireSameOrigin(request, response) ||
    !rateLimit(request, response, { scope: "admin-tools", limit: 30, windowMs: 60_000 }) ||
    (request.method === "POST" && !enforceJsonBodyLimit(request, response, 16_384))
  ) return;

  try {
    const { client, user } = await requireAdmin(request);
    const { data: integration, error: readError } = await client
      .from("platform_integrations")
      .select("*")
      .eq("provider", "resend")
      .maybeSingle();
    if (readError) throw readError;

    let saved = null;
    if (integration?.encrypted_config)
      saved = decryptIntegrationConfig(integration.encrypted_config);

    if (request.method === "GET")
      return response.status(200).json({
        provider: "resend",
        configured: Boolean(saved?.api_key && saved?.from_email && saved?.template_id),
        active: integration?.status === "active",
        api_key_hint: maskKey(saved?.api_key),
        from_email: saved?.from_email || "",
        template_id: saved?.template_id || "",
        last_tested_at: integration?.last_tested_at || null,
        last_test_status: integration?.last_test_status || "never",
      });

    const action = cleanString(request.body?.action, 16);
    if (!["save", "test", "toggle"].includes(action))
      return response.status(400).json({ error: "Ação inválida." });

    if (action === "toggle") {
      if (!integration || !saved)
        return response.status(409).json({ error: "Salve e teste a integração antes de ativar." });
      if (request.body?.active && integration.last_test_status !== "success")
        return response.status(409).json({ error: "Teste a conexão antes de ativar a Resend." });
      const active = Boolean(request.body?.active);
      const { error } = await client.from("platform_integrations")
        .update({ status: active ? "active" : "inactive", updated_at: new Date().toISOString() })
        .eq("id", integration.id);
      if (error) throw error;
      return response.status(200).json({ active });
    }

    const apiKey = cleanString(request.body?.api_key, 256) || saved?.api_key || "";
    const fromEmail = cleanString(request.body?.from_email, 254);
    const templateId = cleanString(request.body?.template_id, 128);
    if (!apiKey.startsWith("re_") || !fromEmail.includes("@") || !templateId)
      return response.status(400).json({
        error: "Informe uma API Key re_, um remetente válido e o ID do template.",
      });
    const config = { api_key: apiKey, from_email: fromEmail, template_id: templateId };

    if (action === "test") {
      await testResend(config);
      if (integration) await client.from("platform_integrations").update({
        last_tested_at: new Date().toISOString(), last_test_status: "success",
      }).eq("id", integration.id);
      return response.status(200).json({ tested: true });
    }

    await testResend(config);
    const record = {
      provider: "resend",
      display_name: "Resend",
      encrypted_config: encryptIntegrationConfig(config),
      configured_by: user.id,
      status: integration?.status || "inactive",
      last_tested_at: new Date().toISOString(),
      last_test_status: "success",
      updated_at: new Date().toISOString(),
    };
    const { error } = await client.from("platform_integrations")
      .upsert(record, { onConflict: "provider" });
    if (error) throw error;
    return response.status(200).json({ saved: true, api_key_hint: maskKey(apiKey) });
  } catch (error) {
    return response.status(error.status || 500).json({
      error: error.status ? error.message : (error.message || "Não foi possível configurar a Resend."),
    });
  }
}
