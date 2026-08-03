import { createClient } from "@supabase/supabase-js";
import { applyApiSecurityHeaders, cleanString, enforceJsonBodyLimit, rateLimit, requireSameOrigin } from "../_security.js";
import { ensureWeeklyPrice, stripeBillingClient } from "./stripeBilling.js";

const plans = {
  essential: { id: "essential", name: "Essencial", fixedCents: 0, ratePercent: 2.5 },
  growth: { id: "growth", name: "Crescimento", fixedCents: 6790, ratePercent: 1 },
  scale: { id: "scale", name: "Escala", fixedCents: 12790, ratePercent: 0 },
};

export default async function handler(request, response) {
  applyApiSecurityHeaders(response);
  if (!["GET", "POST"].includes(request.method)) return response.status(405).json({ error: "Método não permitido." });
  if (!requireSameOrigin(request, response) || !rateLimit(request, response, { scope: "billing-checkout", limit: 30, windowMs: 60_000 }) || (request.method === "POST" && !enforceJsonBodyLimit(request, response, 4096))) return;
  try {
    const token = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "");
    const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
    const { data: auth, error: authError } = await admin.auth.getUser(token);
    if (authError || !auth.user) return response.status(401).json({ error: "Sessão inválida." });
    const { data: control } = await admin.from("platform_user_controls").select("*").eq("user_id", auth.user.id).maybeSingle();
    if (request.method === "GET") return response.status(200).json({
      account_type: control?.account_type || "standard",
      subscription_status: control?.subscription_status || "not_started",
      plan_name: control?.plan_name || null,
      access_status: control?.access_status || "active",
    });
    const workspaceId = cleanString(request.body?.workspace_id, 40);
    const plan = plans[cleanString(request.body?.plan_id, 20)];
    if (!plan || (workspaceId && !/^[0-9a-f-]{36}$/i.test(workspaceId))) return response.status(400).json({ error: "Plano inválido." });
    let workspace = null;
    if (workspaceId) {
      const result = await admin.from("workspaces").select("id,name,owner_id").eq("id", workspaceId).eq("owner_id", auth.user.id).single();
      workspace = result.data;
      if (!workspace) return response.status(403).json({ error: "Negócio não autorizado." });
    }
    if (control?.account_type === "partner") {
      if (workspace) await admin.from("workspaces").update({ platform_plan: plan.id, billing_anchor_at: new Date().toISOString() }).eq("id", workspace.id);
      return response.status(200).json({ active: true, partner: true });
    }
    const effectivePlan = {
      ...plan,
      fixedCents: control?.custom_fixed_cents == null ? plan.fixedCents : Number(control.custom_fixed_cents),
      ratePercent: control?.custom_rate_percent == null ? plan.ratePercent : Number(control.custom_rate_percent),
      priceKeySuffix: control?.custom_fixed_cents == null ? "" : `${auth.user.id}_${Number(control.custom_fixed_cents)}`,
    };
    const { stripe, config } = await stripeBillingClient(admin);
    const priceId = await ensureWeeklyPrice(stripe, effectivePlan);
    let customerId = control?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: auth.user.email, name: auth.user.user_metadata?.full_name || workspace?.name || auth.user.user_metadata?.business_name || "Cliente Maax", metadata: { maax_user_id: auth.user.id } });
      customerId = customer.id;
    }
    if (control?.stripe_subscription_id && ["active", "trialing", "past_due"].includes(control.subscription_status)) {
      const subscription = await stripe.subscriptions.retrieve(control.stripe_subscription_id);
      const subscriptionMetadata = { maax_user_id: auth.user.id, plan_id: plan.id, ...(workspace ? { workspace_id: workspace.id } : {}) };
      await stripe.subscriptions.update(subscription.id, { items: [{ id: subscription.items.data[0].id, price: priceId }], proration_behavior: "none", metadata: subscriptionMetadata });
      if (workspace) await admin.from("workspaces").update({ platform_plan: plan.id, billing_anchor_at: new Date().toISOString() }).eq("id", workspace.id);
      await admin.from("platform_user_controls").upsert({ user_id: auth.user.id, stripe_customer_id: customerId, stripe_subscription_id: subscription.id, subscription_status: subscription.status, plan_name: plan.name, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
      return response.status(200).json({ active: true, updated: true });
    }
    const subscriptionMetadata = { maax_user_id: auth.user.id, plan_id: plan.id, ...(workspace ? { workspace_id: workspace.id } : {}) };
    const session = await stripe.checkout.sessions.create({
      mode: "subscription", ui_mode: "embedded_page", customer: customerId, payment_method_collection: "always",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: { metadata: subscriptionMetadata },
      metadata: subscriptionMetadata,
      redirect_on_completion: "never",
    });
    await admin.from("platform_user_controls").upsert({ user_id: auth.user.id, stripe_customer_id: customerId, subscription_status: "checkout_pending", plan_name: plan.name, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    return response.status(200).json({ client_secret: session.client_secret, publishable_key: config.publishable_key, plan_name: plan.name });
  } catch (error) {
    return response.status(error.status || 500).json({ error: error.message || "Não foi possível iniciar a assinatura." });
  }
}
