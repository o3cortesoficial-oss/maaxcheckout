import { createClient } from "@supabase/supabase-js";
import { isLikelyAutomated } from "../_traffic.js";
import {
  applyApiSecurityHeaders,
  enforceJsonBodyLimit,
  rateLimit,
  requireSameOrigin,
} from "../_security.js";

export default async function handler(request, response) {
  applyApiSecurityHeaders(response);
  if (request.method !== "POST")
    return response.status(405).json({ error: "Método não permitido." });
  if (
    !requireSameOrigin(request, response) ||
    !enforceJsonBodyLimit(request, response, 8192) ||
    !rateLimit(request, response, {
      scope: "checkout-presence",
      limit: 120,
      windowMs: 60000,
    })
  )
    return;
  try {
    const body =
      typeof request.body === "string" ? JSON.parse(request.body) : request.body || {};
    const { productId, sessionId, action = "heartbeat", humanVerified = false } = body;
    if (
      !/^[0-9a-f-]{36}$/i.test(String(sessionId || "")) ||
      !["heartbeat", "leave"].includes(action) ||
      (action !== "leave" &&
        !/^[0-9a-f-]{36}$/i.test(String(productId || "")))
    )
      return response.status(400).json({ error: "Sessão inválida." });

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY,
      { auth: { persistSession: false } },
    );
    if (action === "leave") {
      await supabase.from("checkout_presence").delete().eq("session_id", sessionId);
      return response.status(202).json({ active: false });
    }
    if (!humanVerified || isLikelyAutomated(request))
      return response.status(202).json({ active: false, filtered: true });

    const { data: product } = await supabase
      .from("products")
      .select("id, workspace_id")
      .eq("id", productId)
      .eq("status", "active")
      .maybeSingle();
    if (!product)
      return response.status(404).json({ error: "Produto indisponível." });
    const { data: workspace } = await supabase.from("workspaces").select("billing_suspended").eq("id", product.workspace_id).maybeSingle();
    if (workspace?.billing_suspended)
      return response.status(423).json({ error: "Checkout temporariamente indisponível." });

    const now = new Date().toISOString();
    const { error } = await supabase.from("checkout_presence").upsert(
      {
        session_id: sessionId,
        workspace_id: product.workspace_id,
        product_id: product.id,
        last_seen_at: now,
      },
      { onConflict: "session_id" },
    );
    if (error) throw error;

    await supabase
      .from("checkout_presence")
      .delete()
      .eq("workspace_id", product.workspace_id)
      .lt("last_seen_at", new Date(Date.now() - 60000).toISOString());
    return response.status(202).json({ active: true });
  } catch (error) {
    console.error("Checkout presence update failed", error);
    return response.status(500).json({ error: "Falha ao atualizar presença." });
  }
}
