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

  const [usersResult, workspacesResult, ordersResult, productsResult, gatewaysResult, linksResult, subscriptionsResult, controlsResult] =
    await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      admin.from("workspaces").select("id,name,owner_id,created_at").limit(1000),
      admin
        .from("orders")
        .select("id,workspace_id,status,total_cents,created_at")
        .order("created_at", { ascending: false })
        .limit(1000),
      admin.from("products").select("id,workspace_id,name,slug,status").limit(1000),
      admin
        .from("payment_gateways")
        .select("id,workspace_id,provider,status")
        .limit(1000),
      admin.from("payment_links").select("id,workspace_id,title,slug,active").limit(1000),
      admin.from("subscriptions").select("*").limit(1000),
      admin.from("platform_user_controls").select("*").limit(1000),
    ]);

  const failure = [
    usersResult.error,
    workspacesResult.error,
    ordersResult.error,
    productsResult.error,
    gatewaysResult.error,
    linksResult.error,
    subscriptionsResult.error,
    controlsResult.error,
  ].find(Boolean);
  if (failure)
    return response.status(500).json({ error: "Não foi possível carregar os dados administrativos." });

  const workspaces = workspacesResult.data || [];
  const workspaceNames = new Map(workspaces.map((item) => [item.id, item.name]));
  const orders = ordersResult.data || [];
  const approvedOrders = orders.filter((item) => item.status === "approved");
  const users = usersResult.data?.users || [];
  const products = productsResult.data || [];
  const paymentLinks = linksResult.data || [];
  const subscriptions = subscriptionsResult.data || [];
  const controls = new Map((controlsResult.data || []).map((item) => [item.user_id, item]));
  const workspacesByOwner = new Map();
  workspaces.forEach((item) => {
    const existing = workspacesByOwner.get(item.owner_id) || [];
    existing.push(item);
    workspacesByOwner.set(item.owner_id, existing);
  });

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
    users: users.map((user) => {
      const userWorkspaces = workspacesByOwner.get(user.id) || [];
      const workspaceIds = new Set(userWorkspaces.map((item) => item.id));
      const userOrders = orders.filter((item) => workspaceIds.has(item.workspace_id));
      const approved = userOrders.filter((item) => item.status === "approved");
      const generatedUnpaid = userOrders.filter((item) => item.status !== "approved");
      const control = controls.get(user.id) || {};
      const userSubscriptions = subscriptions.filter((item) => workspaceIds.has(item.workspace_id));
      const currentSubscription = userSubscriptions.find((item) => ["active", "trialing", "past_due"].includes(item.status)) || userSubscriptions[0];
      return {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.user_metadata?.full_name || "",
        business_name: user.user_metadata?.business_name || userWorkspaces[0]?.name || "",
        confirmed: Boolean(user.email_confirmed_at),
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        account_type: control.account_type || "standard",
        access_status: control.access_status || (user.banned_until && new Date(user.banned_until) > new Date() ? "blocked" : "active"),
        block_reason: control.block_reason || "",
        subscription: {
          status: control.subscription_status !== "not_started" ? control.subscription_status : (currentSubscription?.status || "not_started"),
          plan_name: control.plan_name || currentSubscription?.plan_name || "",
          current_period_end: control.current_period_end || currentSubscription?.current_period_end || null,
        },
        finance: {
          paid_cents: approved.reduce((sum, item) => sum + Number(item.total_cents || 0), 0),
          generated_unpaid_cents: generatedUnpaid.reduce((sum, item) => sum + Number(item.total_cents || 0), 0),
          paid_orders: approved.length,
          unpaid_orders: generatedUnpaid.length,
        },
        workspaces: userWorkspaces.map((workspace) => ({
          id: workspace.id, name: workspace.name,
          products: products.filter((item) => item.workspace_id === workspace.id).map((item) => ({ id: item.id, name: item.name, slug: item.slug, status: item.status })),
          payment_links: paymentLinks.filter((item) => item.workspace_id === workspace.id).map((item) => ({ id: item.id, title: item.title, slug: item.slug, status: item.active ? "active" : "inactive" })),
        })),
      };
    }),
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
