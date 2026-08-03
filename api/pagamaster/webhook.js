import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  applyApiSecurityHeaders,
  enforceJsonBodyLimit,
  rateLimit,
} from "../_security.js";
import { accruePaidOrderFee } from "../_lib/platformFee.js";

function decrypt(value) {
  const key = crypto
    .createHash("sha256")
    .update(process.env.GATEWAY_ENCRYPTION_KEY)
    .digest();
  const [iv, tag, encrypted] = String(value)
    .split(".")
    .map((part) => Buffer.from(part, "base64url"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
}

export default async function handler(request, response) {
  applyApiSecurityHeaders(response);
  if (request.method !== "POST")
    return response.status(405).json({ error: "Método não permitido." });
  if (
    !enforceJsonBodyLimit(request, response, 32768) ||
    !rateLimit(request, response, {
      scope: "pagamaster-webhook",
      limit: 180,
      windowMs: 60000,
    })
  )
    return;

  const reported = request.body || {};
  const transactionId = String(reported.id || "").trim();
  if (!/^payin_[a-z0-9_-]+$/i.test(transactionId))
    return response.status(400).json({ error: "Evento inválido." });

  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY,
      { auth: { persistSession: false } },
    );
    let { data: attempt } = await supabase
      .from("payment_attempts")
      .select("*")
      .eq("gateway_transaction_id", transactionId)
      .maybeSingle();
    if (!attempt && reported.referenceId) {
      const fallback = await supabase
        .from("payment_attempts")
        .select("*")
        .eq("reference_id", String(reported.referenceId))
        .maybeSingle();
      attempt = fallback.data;
    }
    if (!attempt) return response.status(202).json({ received: true });

    const { data: gateway } = await supabase
      .from("payment_gateways")
      .select("public_identifier_hint")
      .eq("id", attempt.gateway_id)
      .single();
    if (!gateway?.public_identifier_hint?.includes(":"))
      throw new Error("Gateway configuration unavailable");

    const separator = gateway.public_identifier_hint.indexOf(":");
    const publicKey = gateway.public_identifier_hint.slice(0, separator);
    const secretKey = decrypt(
      gateway.public_identifier_hint.slice(separator + 1),
    );
    const credentials = Buffer.from(`${publicKey}:${secretKey}`).toString(
      "base64",
    );
    const verificationResponse = await fetch(
      `https://api.pagamaster.com/payin/${encodeURIComponent(transactionId)}`,
      { headers: { Authorization: `Basic ${credentials}` } },
    );
    const verified = await verificationResponse.json().catch(() => ({}));
    if (!verificationResponse.ok) throw new Error("Payin verification failed");

    const verifiedStatus = String(verified.status || "").toUpperCase();
    const verifiedAmount = Number(verified.amount);
    const riskReasons = [];
    if (String(verified.id || "") !== transactionId)
      riskReasons.push("transaction_id_mismatch");
    if (verified.referenceId !== attempt.reference_id)
      riskReasons.push("reference_mismatch");
    if (verifiedAmount !== Number(attempt.expected_amount_cents))
      riskReasons.push("amount_mismatch");
    if (
      reported.status &&
      String(reported.status).toUpperCase() !== verifiedStatus
    )
      riskReasons.push("webhook_status_mismatch");
    if (!attempt.order_id && verifiedStatus === "APPROVED")
      riskReasons.push("approved_without_order");
    const reconciliationSafe = !riskReasons.some((reason) =>
      [
        "transaction_id_mismatch",
        "reference_mismatch",
        "amount_mismatch",
        "approved_without_order",
      ].includes(reason),
    );

    const now = new Date().toISOString();
    await supabase.from("gateway_webhook_events").insert({
      workspace_id: attempt.workspace_id,
      payment_attempt_id: attempt.id,
      gateway_transaction_id: transactionId,
      reported_status: reported.status || null,
      verified_status: verifiedStatus,
      reported_amount_cents:
        reported.amount == null ? null : Number(reported.amount),
      verified_amount_cents: verifiedAmount,
      is_verified: true,
      risk_reasons: riskReasons,
      payload: {
        id: reported.id,
        status: reported.status,
        amount: reported.amount,
        referenceId: reported.referenceId,
        paymentMethod: reported.paymentMethod,
        updatedAt: reported.updatedAt,
      },
    });

    await supabase
      .from("payment_attempts")
      .update({
        gateway_amount_cents: verifiedAmount,
        status: verifiedStatus,
        risk_status: riskReasons.length ? "suspected" : "clear",
        risk_reasons: riskReasons,
        gateway_snapshot: {
          id: verified.id,
          referenceId: verified.referenceId,
          status: verifiedStatus,
          amount: verifiedAmount,
          paymentMethod: verified.paymentMethod,
          externalId: verified.externalId || null,
          netAmount: verified.netAmount ?? null,
          reservedAmount: verified.reservedAmount ?? null,
        },
        approved_at: verifiedStatus === "APPROVED" ? now : attempt.approved_at,
        last_webhook_at: now,
        updated_at: now,
      })
      .eq("id", attempt.id);

    if (attempt.order_id && reconciliationSafe) {
      const orderStatus =
        verifiedStatus === "APPROVED"
          ? "approved"
          : ["REFUNDED", "CHARGEBACK", "MED"].includes(verifiedStatus)
            ? "refunded"
            : ["FAILED", "REFUSED", "CANCELED", "EXPIRED"].includes(
                  verifiedStatus,
                )
              ? "failed"
              : "pending";
      await supabase
        .from("orders")
        .update({
          status: orderStatus,
          paid_at: verifiedStatus === "APPROVED" ? now : null,
          updated_at: now,
        })
        .eq("id", attempt.order_id);
    }

    if (verifiedStatus === "APPROVED" && attempt.order_id && reconciliationSafe) {
      const { data: existingTransaction } = await supabase
        .from("transactions")
        .select("id")
        .eq("provider", "pagamaster")
        .eq("provider_reference", transactionId)
        .eq("type", "charge")
        .maybeSingle();
      if (!existingTransaction) {
        await supabase.from("transactions").insert({
          workspace_id: attempt.workspace_id,
          order_id: attempt.order_id,
          type: "charge",
          status: "completed",
          amount_cents: verifiedAmount,
          provider: "pagamaster",
          provider_reference: transactionId,
          description: "Venda aprovada e conciliada pela Pagamaster",
          processed_at: now,
        });
      }
      await accruePaidOrderFee(supabase, {
        workspaceId: attempt.workspace_id,
        orderId: attempt.order_id,
        amountCents: verifiedAmount,
      });
    }

    return response.status(200).json({ received: true, verified: true });
  } catch (error) {
    console.error("Pagamaster webhook processing failed", error);
    return response.status(500).json({ error: "Falha ao conciliar evento." });
  }
}
