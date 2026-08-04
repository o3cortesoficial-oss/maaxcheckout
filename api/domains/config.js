import { createClient } from "@supabase/supabase-js";
import {
  applyApiSecurityHeaders,
  enforceJsonBodyLimit,
  rateLimit,
  requireSameOrigin,
} from "../_security.js";

const platformHosts = new Set([
  "maaxcheckout.vercel.app",
  "www.maaxcheckout.vercel.app",
  "maaxcheckout.lat",
  "www.maaxcheckout.lat",
]);

function normalizeDomain(value) {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split(/[/?#]/)[0]
    .replace(/\.$/, "");
  if (
    raw.length < 4 ||
    raw.length > 253 ||
    raw.includes("*") ||
    platformHosts.has(raw) ||
    raw.endsWith(".vercel.app") ||
    !/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(
      raw,
    )
  )
    return "";
  return raw;
}

function isCheckoutSubdomain(hostname) {
  const labels = String(hostname || "").split(".").filter(Boolean);
  const apexLabelCount = hostname.endsWith(".com.br") ? 3 : 2;
  return labels.length > apexLabelCount;
}

function supabaseFor(request) {
  const token = String(request.headers.authorization || "").replace(
    /^Bearer\s+/i,
    "",
  );
  if (!token)
    throw Object.assign(new Error("Sessão ausente."), { status: 401 });
  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    },
  );
}

const vercelQuery = () => {
  const teamId = process.env.VERCEL_TEAM_ID;
  return teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
};

async function vercelRequest(path, options = {}) {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId)
    throw Object.assign(
      new Error("Integração de domínios ainda não configurada no servidor."),
      { status: 503, code: "VERCEL_DOMAIN_INTEGRATION_MISSING" },
    );
  const result = await fetch(
    `https://api.vercel.com${path.replace("{project}", encodeURIComponent(projectId))}${vercelQuery()}`,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    },
  );
  const payload = await result.json().catch(() => ({}));
  if (!result.ok) {
    const message =
      payload.error?.message || payload.message || "A Vercel recusou a operação.";
    throw Object.assign(new Error(message), {
      status: result.status,
      code: payload.error?.code,
    });
  }
  return payload;
}

function flattenDnsValues(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(flattenDnsValues);
  if (typeof value === "object")
    return flattenDnsValues(value.value || value.cname || value.ip);
  return String(value)
    .split(",")
    .map((item) => item.trim().replace(/\.$/, ""))
    .filter(Boolean);
}

function preferredDnsValues(configuration, key, fallback) {
  const recommended = configuration?.[key];
  const ranked = Array.isArray(recommended)
    ? [...recommended].sort((a, b) => Number(a?.rank || 0) - Number(b?.rank || 0))
    : [recommended];
  for (const candidate of ranked) {
    const [value] = flattenDnsValues(candidate);
    if (value) return [value];
  }
  return [fallback];
}

function dnsGuide(domain, verification = [], configuration = null) {
  const labels = domain.split(".");
  const apexLabelCount = domain.endsWith(".com.br") ? 3 : 2;
  const looksLikeSubdomain = labels.length > apexLabelCount;
  const ownership = Array.isArray(verification)
    ? verification.find((item) => item.type === "TXT")
    : null;
  const recordType = looksLikeSubdomain ? "CNAME" : "A";
  const values = ownership
    ? [ownership.value]
    : looksLikeSubdomain
      ? preferredDnsValues(configuration, "recommendedCNAME", "cname.vercel-dns-0.com")
      : preferredDnsValues(configuration, "recommendedIPv4", "76.76.21.21");
  return {
    type: ownership?.type || recordType,
    name: ownership?.domain || (looksLikeSubdomain ? labels.slice(0, -apexLabelCount).join(".") : "@"),
    value: values[0],
    values,
    ownershipRequired: Boolean(ownership),
    hostnameType: looksLikeSubdomain ? "subdomain" : "apex",
    explanation: ownership
      ? "Adicione primeiro este TXT para confirmar que o domínio pertence a você. Depois teste novamente para receber o registro de apontamento."
      : looksLikeSubdomain
        ? "Subdomínios usam CNAME. Não adicione um registro A no mesmo host."
        : "Domínios raiz usam A com host @. Não adicione CNAME no domínio raiz.",
  };
}

async function getDomainConfiguration(hostname) {
  return vercelRequest(`/v6/domains/${encodeURIComponent(hostname)}/config`).catch(() => null);
}

async function saveDomainSettings(supabase, workspaceId, customDomain) {
  const { data: config } = await supabase
    .from("checkout_configs")
    .select("id,settings,modules,status")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  const settings = { ...(config?.settings || {}), custom_domain: customDomain };
  const result = config?.id
    ? await supabase
        .from("checkout_configs")
        .update({ settings, updated_at: new Date().toISOString() })
        .eq("id", config.id)
    : await supabase.from("checkout_configs").insert({
        workspace_id: workspaceId,
        name: "Checkout principal",
        settings,
        modules: [],
        status: "draft",
      });
  if (result.error) throw result.error;
}

export default async function handler(request, response) {
  applyApiSecurityHeaders(response);
  if (!["GET", "POST", "DELETE"].includes(request.method))
    return response.status(405).json({ error: "Método não permitido." });
  if (
    !requireSameOrigin(request, response) ||
    !rateLimit(request, response, {
      scope: "domain-config",
      limit: 30,
      windowMs: 60000,
    }) ||
    (["POST", "DELETE"].includes(request.method) &&
      !enforceJsonBodyLimit(request, response, 8192))
  )
    return;

  try {
    const supabase = supabaseFor(request);
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user)
      return response.status(401).json({ error: "Sessão inválida." });
    const workspaceId =
      request.method === "GET"
        ? request.query.workspaceId
        : request.body?.workspaceId;
    if (!/^[0-9a-f-]{36}$/i.test(String(workspaceId || "")))
      return response.status(400).json({ error: "Negócio inválido." });
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("id")
      .eq("id", workspaceId)
      .maybeSingle();
    if (!workspace)
      return response.status(403).json({ error: "Acesso negado." });
    const { data: config } = await supabase
      .from("checkout_configs")
      .select("settings")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    const saved = config?.settings?.custom_domain || null;

    if (request.method === "GET") {
      if (!saved?.hostname) return response.status(200).json({ domain: null });
      try {
        const remote = await vercelRequest(
          `/v9/projects/{project}/domains/${encodeURIComponent(saved.hostname)}`,
        );
        const configuration = await getDomainConfiguration(saved.hostname);
        const domain = {
          ...saved,
          verified: Boolean(remote.verified),
          dns: dnsGuide(saved.hostname, remote.verification, configuration),
          requires_subdomain: !isCheckoutSubdomain(saved.hostname),
          checked_at: new Date().toISOString(),
        };
        await saveDomainSettings(supabase, workspaceId, domain);
        return response.status(200).json({ domain });
      } catch (error) {
        if (error.code === "VERCEL_DOMAIN_INTEGRATION_MISSING") throw error;
        return response.status(200).json({
          domain: { ...saved, requires_subdomain: !isCheckoutSubdomain(saved.hostname) },
        });
      }
    }

    if (request.method === "DELETE") {
      if (saved?.hostname) {
        await vercelRequest(
          `/v9/projects/{project}/domains/${encodeURIComponent(saved.hostname)}`,
          { method: "DELETE" },
        ).catch((error) => {
          if (error.status !== 404) throw error;
        });
      }
      await saveDomainSettings(supabase, workspaceId, null);
      return response.status(200).json({ removed: true });
    }

    const action = request.body?.action;
    const hostname = normalizeDomain(request.body?.domain || saved?.hostname);
    if (!hostname)
      return response.status(400).json({ error: "Informe um domínio válido." });
    if (!isCheckoutSubdomain(hostname))
      return response.status(400).json({
        error: "Use um subdomínio completo, por exemplo checkout.sualoja.com. Domínios raiz não são aceitos.",
        code: "CHECKOUT_SUBDOMAIN_REQUIRED",
      });
    if (action === "add") {
      if (!process.env.SUPABASE_SECRET_KEY)
        throw Object.assign(new Error("Configuração segura indisponível."), {
          status: 503,
        });
      const admin = createClient(
        process.env.VITE_SUPABASE_URL,
        process.env.SUPABASE_SECRET_KEY,
        { auth: { persistSession: false } },
      );
      const { data: conflict } = await admin
        .from("checkout_configs")
        .select("workspace_id")
        .contains("settings", { custom_domain: { hostname } })
        .neq("workspace_id", workspaceId)
        .limit(1)
        .maybeSingle();
      if (conflict)
        return response.status(409).json({
          error: "Este domínio já está conectado a outro negócio da Maax.",
        });
      const remote = await vercelRequest(`/v10/projects/{project}/domains`, {
        method: "POST",
        body: JSON.stringify({ name: hostname }),
      });
      const configuration = await getDomainConfiguration(hostname);
      const domain = {
        hostname,
        verified: Boolean(remote.verified),
        dns: dnsGuide(hostname, remote.verification, configuration),
        requires_subdomain: false,
        created_at: new Date().toISOString(),
        checked_at: new Date().toISOString(),
      };
      await saveDomainSettings(supabase, workspaceId, domain);
      return response.status(200).json({ domain });
    }
    if (action === "verify") {
      const remote = await vercelRequest(
        `/v9/projects/{project}/domains/${encodeURIComponent(hostname)}/verify`,
        { method: "POST" },
      );
      const configuration = await getDomainConfiguration(hostname);
      const domain = {
        ...(saved || {}),
        hostname,
        verified: Boolean(remote.verified),
        dns: dnsGuide(hostname, remote.verification, configuration),
        requires_subdomain: false,
        checked_at: new Date().toISOString(),
      };
      await saveDomainSettings(supabase, workspaceId, domain);
      return response.status(200).json({ domain });
    }
    return response.status(400).json({ error: "Ação inválida." });
  } catch (error) {
    console.error("Custom domain operation failed", {
      status: error.status || 500,
      code: error.code,
      message: error.message,
    });
    return response.status(error.status || 500).json({
      error:
        error.status && error.status < 500
          ? error.message
          : "Não foi possível concluir a configuração do domínio.",
      code: error.code || null,
    });
  }
}
