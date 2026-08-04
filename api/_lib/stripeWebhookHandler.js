import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { applyApiSecurityHeaders, readLimitedBody, rateLimit } from "../_security.js";
import { invoiceSubscriptionId, stripeBillingClient } from "./stripeBilling.js";

export default async function handler(request, response) {
  applyApiSecurityHeaders(response);
  if (request.method !== "POST") return response.status(405).json({ error: "Método não permitido." });
  if (!rateLimit(request, response, { scope: "stripe-webhook", limit: 240, windowMs: 60_000 })) return;
  const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
  try {
    const { stripe, config: saved } = await stripeBillingClient(admin);
    const secret = process.env.STRIPE_WEBHOOK_SECRET || saved.webhook_secret;
    if (!secret) throw new Error("Segredo do webhook não configurado.");
    const payload = await readLimitedBody(request, 32768);
    const signature = request.headers["stripe-signature"];
    const event = stripe.webhooks.constructEvent(payload, signature, secret);
    const object = event.data.object;
    const subscriptionId = object.object === "subscription" ? object.id : invoiceSubscriptionId(object);
    let userId = object.metadata?.maax_user_id || null;
    if (!userId && subscriptionId) {
      const subscription = object.object === "subscription" ? object : await stripe.subscriptions.retrieve(subscriptionId);
      userId = subscription.metadata?.maax_user_id || null;
    }
    if (userId) {
      const now = new Date().toISOString();
      if (event.type.startsWith("customer.subscription.")) {
        const status = event.type === "customer.subscription.deleted" ? "cancelled" : object.status;
        await admin.from("platform_user_controls").upsert({
          user_id: userId, stripe_customer_id: typeof object.customer === "string" ? object.customer : object.customer?.id,
          stripe_subscription_id: object.id, subscription_status: status,
          plan_name: object.metadata?.plan_id || null,
          current_period_end: object.current_period_end ? new Date(object.current_period_end * 1000).toISOString() : null,
          access_status: ["active", "trialing"].includes(status) ? "active" : status === "cancelled" ? "blocked" : "active",
          block_reason: status === "cancelled" ? "Assinatura cancelada" : null, updated_at: now,
        }, { onConflict: "user_id" });
        if (object.metadata?.workspace_id && ["active", "trialing"].includes(status))
          await admin.from("workspaces").update({ platform_plan: object.metadata.plan_id, billing_anchor_at: now }).eq("id", object.metadata.workspace_id);
        if (["active", "trialing"].includes(status))
          await admin.from("workspaces").update({ billing_suspended: false }).eq("owner_id", userId);
        else if (["past_due", "unpaid", "cancelled", "canceled"].includes(status))
          await admin.from("workspaces").update({ billing_suspended: true }).eq("owner_id", userId);
      }
      if (event.type === "invoice.paid") {
        const { data: currentControl } = await admin.from("platform_user_controls").select("subscription_status").eq("user_id", userId).maybeSingle();
        const alreadyCancelled = ["cancelled", "canceled"].includes(currentControl?.subscription_status);
        if (!alreadyCancelled) {
          await admin.from("platform_user_controls").update({ subscription_status: "active", access_status: "active", block_reason: null, updated_at: now }).eq("user_id", userId);
          await admin.from("workspaces").update({ billing_suspended: false }).eq("owner_id", userId);
        }
        const { data: referred } = await admin.from("platform_user_controls").select("referred_by_user_id,referred_at").eq("user_id", userId).maybeSingle();
        if (referred?.referred_by_user_id && referred.referred_at) {
          const firstMonthEnds = new Date(referred.referred_at);
          firstMonthEnds.setMonth(firstMonthEnds.getMonth() + 1);
          const paidAt = new Date((object.status_transitions?.paid_at || event.created) * 1000);
          const gross = Math.max(0, Number(object.amount_paid || 0));
          if (paidAt < firstMonthEnds && gross > 0) await admin.from("partner_commissions").upsert({
            partner_user_id: referred.referred_by_user_id,
            referred_user_id: userId,
            stripe_invoice_id: object.id,
            gross_platform_revenue_cents: gross,
            commission_cents: Math.round(gross / 2),
          }, { onConflict: "stripe_invoice_id", ignoreDuplicates: true });
        }
      }
      if (["invoice.payment_failed", "invoice.finalization_failed"].includes(event.type)) {
        const { data: control } = await admin.from("platform_user_controls").select("account_type").eq("user_id", userId).maybeSingle();
        if (control?.account_type !== "partner") {
          await admin.from("platform_user_controls").update({ subscription_status: "past_due", access_status: "blocked", block_reason: "Cobrança semanal não paga", updated_at: now }).eq("user_id", userId);
          await admin.from("workspaces").update({ billing_suspended: true }).eq("owner_id", userId);
        }
      }
    }
    return response.status(200).json({ received: true });
  } catch (error) {
    if (error?.status === 413) return response.status(413).json({ error: "Evento muito grande." });
    if (error instanceof Stripe.errors.StripeSignatureVerificationError) return response.status(400).json({ error: "Assinatura inválida." });
    console.error("Stripe webhook failed", error);
    return response.status(500).json({ error: "Falha ao processar evento Stripe." });
  }
}
