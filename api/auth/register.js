import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import {
  applyApiSecurityHeaders,
  cleanString,
  enforceJsonBodyLimit,
  rateLimit,
  requireSameOrigin,
} from "../_security.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const appOrigin = (request) => {
  const host = String(
    request.headers["x-forwarded-host"] || request.headers.host || "",
  )
    .split(",")[0]
    .trim();
  const protocol = String(request.headers["x-forwarded-proto"] || "https")
    .split(",")[0]
    .trim();
  return `${protocol}://${host}`;
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
    "RESEND_API_KEY",
    "RESEND_FROM_EMAIL",
    "RESEND_CONFIRM_TEMPLATE_ID",
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
  const redirectTo = `${appOrigin(request)}/login?confirmed=1`;
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

  const confirmUrl = linkData?.properties?.action_link;
  if (!confirmUrl) {
    if (linkData?.user?.id)
      await admin.auth.admin.deleteUser(linkData.user.id).catch(() => undefined);
    return response.status(502).json({ error: "Não foi possível gerar a confirmação." });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error: emailError } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to: email,
    subject: "Confirme sua conta na Maax",
    template: {
      id: process.env.RESEND_CONFIRM_TEMPLATE_ID,
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
