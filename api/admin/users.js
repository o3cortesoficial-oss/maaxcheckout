import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import { ensureWeeklyPrice, stripeBillingClient } from "../_lib/stripeBilling.js";
import {
  applyApiSecurityHeaders,
  cleanString,
  enforceJsonBodyLimit,
  rateLimit,
  requireSameOrigin,
} from "../_security.js";

const adminEmail = () =>
  String(process.env.PLATFORM_ADMIN_EMAIL || "saidlabsglobal@gmail.com").trim().toLowerCase();

async function adminClient(request) {
  const token = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) throw Object.assign(new Error("Sessão ausente."), { status: 401 });
  const client = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || String(data.user?.email || "").toLowerCase() !== adminEmail())
    throw Object.assign(new Error("Acesso administrativo negado."), { status: 403 });
  return { client, actor: data.user };
}

export default async function handler(request, response) {
  applyApiSecurityHeaders(response);
  if (request.method !== "POST") return response.status(405).json({ error: "Método não permitido." });
  if (!requireSameOrigin(request, response) ||
      !rateLimit(request, response, { scope: "admin-users", limit: 30, windowMs: 60_000 }) ||
      !enforceJsonBodyLimit(request, response, 8192)) return;
  try {
    const { client, actor } = await adminClient(request);
    const userId = cleanString(request.body?.user_id, 40);
    const action = cleanString(request.body?.action, 24);
    if (!/^[0-9a-f-]{36}$/i.test(userId) || !["partner", "block", "unblock", "commercial"].includes(action))
      return response.status(400).json({ error: "Ação ou usuário inválido." });
    if (userId === actor.id && action === "block")
      return response.status(409).json({ error: "A conta administradora principal não pode bloquear a si própria." });

    const update = { user_id: userId, updated_at: new Date().toISOString() };
    if (action === "partner") {
      update.account_type = request.body?.enabled ? "partner" : "standard";
      if (request.body?.enabled) {
        const { data: existing } = await client.from("platform_user_controls").select("partner_code").eq("user_id", userId).maybeSingle();
        update.partner_code = existing?.partner_code || crypto.randomBytes(6).toString("hex").toUpperCase();
      }
    }
    if (action === "commercial") {
      const plan = cleanString(request.body?.plan_name, 20).toLowerCase();
      const fixed = Number(request.body?.custom_fixed_cents);
      const rate = Number(request.body?.custom_rate_percent);
      if (!['essential','growth','scale'].includes(plan) || !Number.isInteger(fixed) || fixed < 0 || fixed > 10000000 || !Number.isFinite(rate) || rate < 0 || rate > 100)
        return response.status(400).json({ error: "CondiÃ§Ãµes comerciais invÃ¡lidas." });
      update.plan_name = plan;
      update.custom_fixed_cents = fixed;
      update.custom_rate_percent = rate;
    }
    if (action === "block") {
      update.access_status = "blocked";
      update.block_reason = cleanString(request.body?.reason, 180) || "Pendência financeira";
      const { error } = await client.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
      if (error) throw error;
    }
    if (action === "unblock") {
      update.access_status = "active";
      update.block_reason = null;
      const { error } = await client.auth.admin.updateUserById(userId, { ban_duration: "none" });
      if (error) throw error;
    }
    const { error } = await client.from("platform_user_controls").upsert(update, { onConflict: "user_id" });
    if (error) throw error;
    if (action === "commercial") {
      await client.from("workspaces").update({ platform_plan: update.plan_name }).eq("owner_id", userId);
      const { data: control } = await client.from("platform_user_controls").select("stripe_subscription_id").eq("user_id", userId).maybeSingle();
      if (control?.stripe_subscription_id) {
        const catalog = { essential: "Essencial", growth: "Crescimento", scale: "Escala" };
        const { stripe } = await stripeBillingClient(client);
        const priceId = await ensureWeeklyPrice(stripe, { id: update.plan_name, name: catalog[update.plan_name], fixedCents: update.custom_fixed_cents, ratePercent: update.custom_rate_percent, priceKeySuffix: `${userId}_${update.custom_fixed_cents}` });
        const subscription = await stripe.subscriptions.retrieve(control.stripe_subscription_id);
        if (subscription.items.data[0]) await stripe.subscriptions.update(subscription.id, {
          items: [{ id: subscription.items.data[0].id, price: priceId }],
          proration_behavior: "none",
          metadata: { ...subscription.metadata, plan_id: update.plan_name },
        });
      }
    }
    return response.status(200).json({ ok: true });
  } catch (error) {
    return response.status(error.status || 500).json({ error: error.message || "Não foi possível atualizar a conta." });
  }
}
