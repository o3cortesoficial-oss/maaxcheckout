import { createClient } from "@supabase/supabase-js";
import { isLikelyAutomated } from "../_traffic.js";
import {
  applyApiSecurityHeaders,
  enforceJsonBodyLimit,
  rateLimit,
  requireSameOrigin,
} from "../_security.js";

const allowedEvents = new Set([
  "checkout_opened",
  "form_started",
  "address_started",
  "payment_method_selected",
  "payment_submitted",
  "payment_created",
  "pix_generated",
  "payment_failed",
]);

export default async function handler(request, response) {
  applyApiSecurityHeaders(response);
  if (request.method !== "POST")
    return response.status(405).json({ error: "Método não permitido." });
  if (
    !requireSameOrigin(request, response) ||
    !enforceJsonBodyLimit(request, response, 8192) ||
    !rateLimit(request, response, {
      scope: "checkout-events",
      limit: 90,
      windowMs: 60000,
    })
  )
    return;
  try {
    const { productId, sessionId, eventType, paymentMethod, humanVerified = false } =
      request.body || {};
    if (
      !allowedEvents.has(eventType) ||
      !/^[0-9a-f-]{36}$/i.test(String(productId || "")) ||
      !/^[0-9a-f-]{36}$/i.test(String(sessionId || ""))
    )
      return response.status(400).json({ error: "Evento inválido." });
    if (
      paymentMethod != null &&
      !["pix", "card", "boleto"].includes(paymentMethod)
    )
      return response.status(400).json({ error: "Pagamento inválido." });
    if (isLikelyAutomated(request))
      return response.status(202).json({ received: false, filtered: true });
    if (eventType !== "checkout_opened" && !humanVerified)
      return response.status(202).json({ received: false, filtered: true });

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY,
      { auth: { persistSession: false } },
    );
    const { data: product } = await supabase
      .from("products")
      .select("id, workspace_id")
      .eq("id", productId)
      .eq("status", "active")
      .maybeSingle();
    if (!product)
      return response.status(404).json({ error: "Produto indisponível." });

    const { error } = await supabase.from("checkout_events").insert({
      workspace_id: product.workspace_id,
      product_id: product.id,
      session_id: sessionId,
      event_type: eventType,
      payment_method: paymentMethod || null,
    });
    if (error) throw error;

    if (eventType !== "checkout_opened") {
      const { error: presenceError } = await supabase
        .from("checkout_presence")
        .upsert(
          {
            session_id: sessionId,
            workspace_id: product.workspace_id,
            product_id: product.id,
            stage: eventType,
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: "session_id" },
        );
      if (presenceError) throw presenceError;
    }
    return response.status(202).json({ received: true });
  } catch (error) {
    console.error("Checkout event capture failed", error);
    return response.status(500).json({ error: "Falha ao registrar evento." });
  }
}
