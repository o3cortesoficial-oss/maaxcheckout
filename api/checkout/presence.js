import { createClient } from "@supabase/supabase-js";

export default async function handler(request, response) {
  if (request.method !== "POST")
    return response.status(405).json({ error: "Método não permitido." });
  try {
    const body =
      typeof request.body === "string" ? JSON.parse(request.body) : request.body || {};
    const { productId, sessionId, action = "heartbeat" } = body;
    if (!/^[0-9a-f-]{36}$/i.test(String(sessionId || "")))
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

    const { data: product } = await supabase
      .from("products")
      .select("id, workspace_id")
      .eq("id", productId)
      .eq("status", "active")
      .maybeSingle();
    if (!product)
      return response.status(404).json({ error: "Produto indisponível." });

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
