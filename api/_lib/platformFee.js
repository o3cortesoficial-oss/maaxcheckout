import { stripeBillingClient } from "./stripeBilling.js";

const rates = { essential: 2.5, growth: 1, scale: 0 };

export async function accruePaidOrderFee(admin, { workspaceId, orderId, amountCents }) {
  const { data: workspace } = await admin.from("workspaces").select("owner_id,platform_plan").eq("id", workspaceId).single();
  if (!workspace) return;
  const rate = rates[workspace.platform_plan] ?? rates.essential;
  const feeCents = Math.round(Number(amountCents || 0) * rate / 100);
  const { data: control } = await admin.from("platform_user_controls").select("account_type,subscription_status,stripe_customer_id,stripe_subscription_id").eq("user_id", workspace.owner_id).maybeSingle();
  const waived = control?.account_type === "partner" || feeCents === 0;
  if (waived) return;
  if (!control?.stripe_customer_id || !control?.stripe_subscription_id || !["active", "trialing"].includes(control.subscription_status)) return;
  const { stripe } = await stripeBillingClient(admin);
  await stripe.invoiceItems.create({
    customer: control.stripe_customer_id, subscription: control.stripe_subscription_id,
    amount: feeCents, currency: "brl", description: `Taxa Maax sobre pedido pago ${orderId}`,
    metadata: { maax_order_id: orderId, workspace_id: workspaceId, rate_percent: String(rate), paid_volume_cents: String(amountCents) },
  }, { idempotencyKey: `maax-order-fee-${orderId}` });
}
