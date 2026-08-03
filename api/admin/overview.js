import { createClient } from "@supabase/supabase-js";
import {
  applyApiSecurityHeaders,
  rateLimit,
  requireSameOrigin,
} from "../_security.js";

const adminEmail = () =>
  String(process.env.PLATFORM_ADMIN_EMAIL || "saidlabsglobal@gmail.com")
    .trim()
    .toLowerCase();

export default async function handler(request, response) {
  applyApiSecurityHeaders(response);
  if (request.method !== "GET")
    return response.status(405).json({ error: "Método não permitido." });
  if (
    !requireSameOrigin(request, response) ||
    !rateLimit(request, response, {
      scope: "admin-overview",
      limit: 30,
      windowMs: 60_000,
    })
  )
    return;

  const token = String(request.headers.authorization || "").replace(
    /^Bearer\s+/i,
    "",
  );
  if (!token) return response.status(401).json({ error: "Sessão ausente." });
  if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY)
    return response.status(503).json({ error: "Administração não configurada." });

  const admin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: identity, error: identityError } =
    await admin.auth.getUser(token);
  if (
    identityError ||
    !identity.user ||
    String(identity.user.email || "").toLowerCase() !== adminEmail()
  )
    return response.status(403).json({ error: "Acesso administrativo negado." });

  const [usersResult, workspacesResult, ordersResult, productsResult, gatewaysResult] =
    await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      admin.from("workspaces").select("id,name,owner_id,created_at").limit(1000),
      admin
        .from("orders")
        .select("id,workspace_id,status,total_cents,created_at")
        .order("created_at", { ascending: false })
        .limit(1000),
      admin.from("products").select("id,workspace_id,status").limit(1000),
      admin
        .from("payment_gateways")
        .select("id,workspace_id,provider,status")
        .limit(1000),
    ]);

  const failure = [
    usersResult.error,
    workspacesResult.error,
    ordersResult.error,
    productsResult.error,
    gatewaysResult.error,
  ].find(Boolean);
  if (failure)
    return response.status(500).json({ error: "Não foi possível carregar os dados administrativos." });

  const workspaces = workspacesResult.data || [];
  const workspaceNames = new Map(workspaces.map((item) => [item.id, item.name]));
  const orders = ordersResult.data || [];
  const approvedOrders = orders.filter((item) => item.status === "approved");
  const users = usersResult.data?.users || [];

  return response.status(200).json({
    metrics: {
      users: users.length,
      workspaces: workspaces.length,
      orders: orders.length,
      approved_orders: approvedOrders.length,
      approved_revenue_cents: approvedOrders.reduce(
        (total, item) => total + Number(item.total_cents || 0),
        0,
      ),
      active_products: (productsResult.data || []).filter(
        (item) => item.status === "active",
      ).length,
      active_gateways: (gatewaysResult.data || []).filter(
        (item) => item.status === "active",
      ).length,
    },
    users: users.slice(0, 100).map((user) => ({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.user_metadata?.full_name || "",
      business_name: user.user_metadata?.business_name || "",
      confirmed: Boolean(user.email_confirmed_at),
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
    })),
    workspaces: workspaces
      .map((item) => ({
        ...item,
        owner_email: users.find((user) => user.id === item.owner_id)?.email || "",
      }))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    recent_orders: orders.slice(0, 50).map((item) => ({
      ...item,
      workspace_name: workspaceNames.get(item.workspace_id) || "Operação removida",
    })),
    tools: [],
    generated_at: new Date().toISOString(),
  });
}
