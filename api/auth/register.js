import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import {
  applyApiSecurityHeaders,
  cleanString,
  enforceJsonBodyLimit,
  rateLimit,
  requireSameOrigin,
} from "../_security.js";
import { decryptIntegrationConfig } from "../_integrationSecrets.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const appOrigin = () => {
  const configured = String(
    process.env.PUBLIC_APP_URL ||
      process.env.VITE_PUBLIC_APP_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      "https://maaxcheckout.lat",
  ).trim();
  const withProtocol = /^https?:\/\//i.test(configured)
    ? configured
    : `https://${configured}`;
  try {
    const url = new URL(withProtocol);
    if (["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname))
      return "https://maaxcheckout.lat";
    return url.origin;
  } catch {
    return "https://maaxcheckout.lat";
  }
};

export default async function handler(request, response) {
  applyApiSecurityHeaders(response);
  if (request.method !== "POST")
    return response.status(405).json({ error: "Método não permitido." });
  if (
    !requireSameOrigin(request, response) ||
    !rateLimit(request, response, {
      scope: "auth-register",
      limit: 5,
      windowMs: 15 * 60 * 1000,
    }) ||
    !enforceJsonBodyLimit(request, response, 8192)
  )
    return;

  const name = cleanString(request.body?.name, 80);
  const businessName = cleanString(request.body?.business_name, 60);
  const email = cleanString(request.body?.email, 254).toLowerCase();
  const password = String(request.body?.password || "");
  const referralCode = cleanString(request.body?.referral_code, 48).toUpperCase();
  if (name.length < 2 || businessName.length < 2)
    return response
      .status(400)
      .json({ error: "Informe seu nome e o nome do negócio." });
  if (!emailPattern.test(email))
    return response.status(400).json({ error: "Informe um e-mail válido." });
  if (
    password.length < 8 ||
    password.length > 72 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/\d/.test(password)
  )
    return response.status(400).json({
      error: "A senha deve ter 8 caracteres, maiúscula, minúscula e número.",
    });

  const requiredEnvironment = [
    "VITE_SUPABASE_URL",
    "SUPABASE_SECRET_KEY",
  ];
  if (requiredEnvironment.some((key) => !process.env[key]))
    return response.status(503).json({
      error: "O cadastro por e-mail ainda não foi configurado no servidor.",
    });

  const admin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  let resendConfig = {
    api_key: process.env.RESEND_API_KEY,
    from_email: process.env.RESEND_FROM_EMAIL,
    template_id: process.env.RESEND_CONFIRM_TEMPLATE_ID,
  };
  const { data: savedIntegration } = await admin
    .from("platform_integrations")
    .select("encrypted_config,status")
    .eq("provider", "resend")
    .eq("status", "active")
    .maybeSingle();
  if (savedIntegration?.encrypted_config) {
    try {
      resendConfig = decryptIntegrationConfig(savedIntegration.encrypted_config);
    } catch {
      return response.status(503).json({ error: "A configuração de e-mail precisa ser revisada." });
    }
  }
  if (!resendConfig.api_key || !resendConfig.from_email || !resendConfig.template_id)
    return response.status(503).json({
      error: "O cadastro por e-mail ainda não foi configurado no servidor.",
    });
  const publicOrigin = appOrigin();
  let referrerId = null;
  if (referralCode) {
    const { data: partner } = await admin.from("platform_user_controls")
      .select("user_id").eq("partner_code", referralCode).eq("account_type", "partner").maybeSingle();
    referrerId = partner?.user_id || null;
  }
  const redirectTo = `${publicOrigin}/login?confirmed=1`;
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: {
        redirectTo,
        data: { name, business_name: businessName },
      },
    });

  if (linkError) {
    if (/already|registered|exists/i.test(linkError.message || ""))
      return response.status(200).json({ ok: true });
    return response.status(400).json({ error: "Não foi possível criar a conta." });
  }

  const tokenHash = linkData?.properties?.hashed_token;
  const confirmUrl = tokenHash
    ? `${publicOrigin}/login?token_hash=${encodeURIComponent(tokenHash)}&type=signup`
    : null;
  if (!confirmUrl) {
    if (linkData?.user?.id)
      await admin.auth.admin.deleteUser(linkData.user.id).catch(() => undefined);
    return response.status(502).json({ error: "Não foi possível gerar a confirmação." });
  }

  if (linkData?.user?.id && referrerId) {
    const { error: referralError } = await admin.from("platform_user_controls").upsert({
      user_id: linkData.user.id,
      referred_by_user_id: referrerId,
      referred_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (referralError) {
      await admin.auth.admin.deleteUser(linkData.user.id).catch(() => undefined);
      return response.status(502).json({ error: "NÃ£o foi possÃ­vel vincular o convite." });
    }
  }

  const resend = new Resend(resendConfig.api_key);
  const { error: emailError } = await resend.emails.send({
    from: resendConfig.from_email,
    to: email,
    subject: "Confirme sua conta na Maax",
    template: {
      id: resendConfig.template_id,
      variables: {
        USER_NAME: name,
        BUSINESS_NAME: businessName,
        CONFIRM_URL: confirmUrl,
      },
    },
    tags: [{ name: "category", value: "account_confirmation" }],
  });

  if (emailError) {
    if (linkData?.user?.id)
      await admin.auth.admin.deleteUser(linkData.user.id).catch(() => undefined);
    return response.status(502).json({
      error: "A conta não foi criada porque o e-mail não pôde ser enviado.",
    });
  }

  return response.status(201).json({ ok: true });
}
