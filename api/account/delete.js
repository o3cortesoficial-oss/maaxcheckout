import { createClient } from "@supabase/supabase-js";
import { applyApiSecurityHeaders, enforceJsonBodyLimit, rateLimit, requireSameOrigin, safeServerError } from "../_security.js";

export default async function handler(request, response) {
  applyApiSecurityHeaders(response);
  if (request.method !== "POST") return response.status(405).json({ error: "Método não permitido." });
  if (!requireSameOrigin(request, response) ||
      !rateLimit(request, response, { scope: "account-delete", limit: 3, windowMs: 60_000 }) ||
      !enforceJsonBodyLimit(request, response, 1024)) return;
  try {
    const token = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "");
    if (!token) return response.status(401).json({ error: "Sessão ausente." });
    const client = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return response.status(401).json({ error: "Sessão inválida." });
    const protectedEmail = String(process.env.PLATFORM_ADMIN_EMAIL || "saidlabsglobal@gmail.com").toLowerCase();
    if (String(data.user.email || "").toLowerCase() === protectedEmail)
      return response.status(409).json({ error: "A conta administradora principal não pode ser excluída." });
    const deletion = await client.auth.admin.deleteUser(data.user.id);
    if (deletion.error) throw deletion.error;
    return response.status(200).json({ ok: true });
  } catch (error) {
    console.error("Account deletion failed", { name: error?.name, message: error?.message });
    return safeServerError(response, error, "Não foi possível excluir a conta.");
  }
}
