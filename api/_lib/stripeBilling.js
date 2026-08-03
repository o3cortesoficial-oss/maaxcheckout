import Stripe from "stripe";
import { decryptIntegrationConfig } from "../_integrationSecrets.js";

export async function stripeBillingClient(admin) {
  const { data, error } = await admin.from("platform_integrations").select("encrypted_config,status").eq("provider", "stripe").maybeSingle();
  if (error) throw error;
  if (!data?.encrypted_config) throw Object.assign(new Error("Stripe não configurada."), { status: 409 });
  const config = decryptIntegrationConfig(data.encrypted_config);
  if (!config.secret_key) throw Object.assign(new Error("Chave Stripe ausente."), { status: 409 });
  return { stripe: new Stripe(config.secret_key), config };
}

export async function ensureWeeklyPrice(stripe, plan) {
  const lookupKey = `maax_${plan.id}_weekly_brl_v1`;
  const existing = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  if (existing.data[0]) return existing.data[0].id;
  const product = await stripe.products.create({ name: `Maax ${plan.name}`, metadata: { maax_plan: plan.id } });
  const price = await stripe.prices.create({
    currency: "brl",
    unit_amount: plan.fixedCents,
    recurring: { interval: "week", interval_count: 1 },
    product: product.id,
    lookup_key: lookupKey,
    metadata: { maax_plan: plan.id, variable_rate: String(plan.ratePercent) },
  });
  return price.id;
}

export const invoiceSubscriptionId = (invoice) =>
  typeof invoice.subscription === "string" ? invoice.subscription :
  invoice.parent?.subscription_details?.subscription || null;

