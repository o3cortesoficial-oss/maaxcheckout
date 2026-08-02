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
    if (productError || !product)
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
      referenceId: crypto.randomUUID(),
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
    const pagamasterResponse = await fetch("https://api.pagamaster.com/payin", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const result = await pagamasterResponse.json().catch(() => ({}));
    if (!pagamasterResponse.ok)
      return response.status(pagamasterResponse.status).json({
        error:
          result.message || result.error || "A Pagamaster recusou a cobrança.",
        code: result.code,
      });
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
