import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function decrypt(value) {
  const key = crypto
    .createHash("sha256")
    .update(process.env.GATEWAY_ENCRYPTION_KEY)
    .digest();
  const [iv, tag, encrypted] = value
    .split(".")
    .map((part) => Buffer.from(part, "base64url"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
}

const digits = (value) => String(value || "").replace(/\D/g, "");

export default async function handler(request, response) {
  if (request.method !== "POST")
    return response.status(405).json({ error: "Método não permitido." });
  try {
    if (!process.env.SUPABASE_SECRET_KEY)
      throw new Error("SUPABASE_SECRET_KEY is not configured");
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY,
      { auth: { persistSession: false } },
    );
    const {
      productId,
      slug,
      paymentMethod,
      customer = {},
      address = {},
      card,
    } = request.body || {};
    let productQuery = supabase
      .from("products")
      .select("*")
      .eq("status", "active");
    productQuery = productId
      ? productQuery.eq("id", productId)
      : productQuery.eq("slug", slug);
    const { data: product, error: productError } =
      await productQuery.maybeSingle();
    if (productError) {
      console.error("Pagamaster payin product lookup failed", {
        code: productError.code,
        message: productError.message,
      });
      return response.status(500).json({
        error: "Não foi possível consultar o produto. Tente novamente em instantes.",
      });
    }
    if (!product)
      return response.status(404).json({
        error: "Produto indisponível. Atualize o checkout e tente novamente.",
      });
    const { data: gateway } = await supabase
      .from("payment_gateways")
      .select("*")
      .eq("workspace_id", product.workspace_id)
      .eq("provider", "pagamaster")
      .eq("status", "active")
      .eq("credentials_configured", true)
      .maybeSingle();
    if (!gateway?.public_identifier_hint?.includes(":"))
      return response
        .status(409)
        .json({ error: "A Pagamaster não está configurada ou ativa." });
    const separator = gateway.public_identifier_hint.indexOf(":");
    const publicKey = gateway.public_identifier_hint.slice(0, separator);
    const secretKey = decrypt(
      gateway.public_identifier_hint.slice(separator + 1),
    );
    const methodMap = { pix: "PIX", boleto: "BOLETO", card: "CREDIT_CARD" };
    const apiMethod = methodMap[paymentMethod];
    if (!apiMethod)
      return response
        .status(400)
        .json({ error: "Forma de pagamento inválida." });
    const payload = {
      paymentMethod: apiMethod,
      amount: Number(product.price_cents),
      webhookUrl: `${request.headers["x-forwarded-proto"] || "https"}://${request.headers.host}/api/pagamaster/webhook`,
      isPhysicalProduct: ["physical", "fisico", "físico"].includes(
        String(product.product_type || "").toLowerCase(),
      ),
      payerIp: String(
        request.headers["x-forwarded-for"] ||
          request.socket?.remoteAddress ||
          "",
      )
        .split(",")[0]
        .trim(),
      customer: {
        name: String(customer.name || "").trim(),
        document: digits(customer.document),
        email: String(customer.email || "").trim(),
        phone: digits(customer.phone),
        address: {
          street: String(address.street || "").trim(),
          number: String(address.number || "").trim(),
          zipCode: String(address.zipCode || "").trim(),
          city: String(address.city || "").trim(),
          state: String(address.state || "")
            .trim()
            .toUpperCase(),
          complement: String(address.complement || "").trim(),
          neighborhood: String(address.neighborhood || "").trim(),
        },
      },
      items: [
        {
          title: product.name,
          description: product.description || undefined,
          quantity: 1,
          unitPrice: Number(product.price_cents),
        },
      ],
    };
    if (apiMethod === "CREDIT_CARD") {
      const [month, shortYear] = String(card?.expiry || "").split("/");
      payload.card = {
        holderName: String(card?.name || "").trim(),
        number: digits(card?.number),
        expirationMonth: month,
        expirationYear: shortYear?.length === 2 ? `20${shortYear}` : shortYear,
        cvv: digits(card?.cvv),
        installments: 1,
      };
    }
    const credentials = Buffer.from(`${publicKey}:${secretKey}`).toString(
      "base64",
    );
    const referenceId = crypto.randomUUID();
    const expectedAmount = Number(product.price_cents);
    const { data: attempt, error: attemptError } = await supabase
      .from("payment_attempts")
      .insert({
        workspace_id: product.workspace_id,
        product_id: product.id,
        gateway_id: gateway.id,
        reference_id: referenceId,
        payment_method: apiMethod,
        expected_amount_cents: expectedAmount,
        status: "creating",
      })
      .select("id")
      .single();
    if (attemptError)
      throw new Error("Não foi possível iniciar a auditoria da cobrança.");
    payload.referenceId = referenceId;
    const pagamasterResponse = await fetch("https://api.pagamaster.com/payin", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const result = await pagamasterResponse.json().catch(() => ({}));
    if (!pagamasterResponse.ok) {
      await supabase
        .from("payment_attempts")
        .update({
          status: "create_failed",
          gateway_snapshot: {
            code: result.code || null,
            message: result.message || result.error || null,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", attempt.id);
      return response.status(pagamasterResponse.status).json({
        error:
          result.message || result.error || "A Pagamaster recusou a cobrança.",
        code: result.code,
      });
    }
    const riskReasons = [];
    if (result.referenceId && result.referenceId !== referenceId)
      riskReasons.push("reference_mismatch");
    if (result.amount != null && Number(result.amount) !== expectedAmount)
      riskReasons.push("amount_mismatch");
    const normalizedStatus = String(result.status || "PENDING").toUpperCase();
    const { data: order } = await supabase
      .from("orders")
      .insert({
        workspace_id: product.workspace_id,
        status: normalizedStatus === "APPROVED" ? "approved" : "pending",
        payment_method: apiMethod.toLowerCase(),
        subtotal_cents: expectedAmount,
        total_cents: expectedAmount,
        paid_at:
          normalizedStatus === "APPROVED" ? new Date().toISOString() : null,
        metadata: {
          product_id: product.id,
          gateway: "pagamaster",
          gateway_transaction_id: result.id,
          reference_id: referenceId,
        },
      })
      .select("id")
      .single();
    await supabase
      .from("payment_attempts")
      .update({
        order_id: order?.id || null,
        gateway_transaction_id: result.id,
        gateway_amount_cents:
          result.amount == null ? expectedAmount : Number(result.amount),
        status: normalizedStatus,
        risk_status: riskReasons.length ? "suspected" : "clear",
        risk_reasons: riskReasons,
        gateway_snapshot: {
          id: result.id,
          referenceId: result.referenceId || referenceId,
          status: normalizedStatus,
          amount: result.amount == null ? expectedAmount : Number(result.amount),
          paymentMethod: result.paymentMethod || apiMethod,
        },
        approved_at:
          normalizedStatus === "APPROVED" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", attempt.id);
    return response.status(201).json({
      id: result.id,
      referenceId: result.referenceId,
      status: result.status,
      paymentMethod: result.paymentMethod,
      pix: result.pix,
      boleto: result.boleto,
      threeDSecurePending: result.threeDSecurePending,
      threeDSecureSdkUrl: result.threeDSecureSdkUrl,
    });
  } catch (error) {
    return response
      .status(500)
      .json({ error: error.message || "Não foi possível criar a cobrança." });
  }
}
