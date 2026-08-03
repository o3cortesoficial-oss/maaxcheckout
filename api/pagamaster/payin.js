import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  applyApiSecurityHeaders,
  cleanString,
  enforceJsonBodyLimit,
  rateLimit,
  requireSameOrigin,
} from "../_security.js";

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
const brlToCents = (value = 0) => {
  const amount = Number(
    String(value).trim().replace(/\./g, "").replace(",", "."),
  );
  return Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100)) : 0;
};
const attributionFields = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_id",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "gbraid",
  "wbraid",
  "ttclid",
  "msclkid",
];
const cleanText = (value, max = 255) =>
  String(value || "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, max) || null;
const normalizeTouch = (touch) => {
  if (!touch || typeof touch !== "object" || Array.isArray(touch)) return null;
  const normalized = {};
  attributionFields.forEach((field) => {
    const value = cleanText(touch[field]);
    if (value) normalized[field] = value;
  });
  normalized.landing_path = cleanText(touch.landing_path, 1800);
  normalized.referrer = cleanText(touch.referrer, 1800);
  const capturedAt = new Date(touch.captured_at);
  normalized.captured_at = Number.isNaN(capturedAt.getTime())
    ? new Date().toISOString()
    : capturedAt.toISOString();
  return normalized;
};
const normalizeAttribution = (attribution) => {
  const firstTouch = normalizeTouch(attribution?.first_touch);
  const lastTouch = normalizeTouch(attribution?.last_touch);
  if (!firstTouch && !lastTouch) return null;
  return {
    model: "last_non_direct_click",
    first_touch: firstTouch || lastTouch,
    last_touch: lastTouch || firstTouch,
  };
};

export default async function handler(request, response) {
  applyApiSecurityHeaders(response);
  if (request.method !== "POST")
    return response.status(405).json({ error: "Método não permitido." });
  if (
    !requireSameOrigin(request, response) ||
    !enforceJsonBodyLimit(request, response, 32768) ||
    !rateLimit(request, response, {
      scope: "pagamaster-payin",
      limit: 20,
      windowMs: 10 * 60 * 1000,
    })
  )
    return;
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
      protectionSelected = false,
      orderBumpProductIds = [],
      shippingOptionId,
      attribution,
      checkoutSessionId,
    } = request.body || {};
    if (
      (productId && !/^[0-9a-f-]{36}$/i.test(String(productId))) ||
      (!productId && (!slug || String(slug).length > 160)) ||
      !["pix", "card", "boleto"].includes(paymentMethod) ||
      !Array.isArray(orderBumpProductIds) ||
      orderBumpProductIds.length > 3
    )
      return response.status(400).json({ error: "Dados da cobrança inválidos." });
    const normalizedCustomer = {
      name: cleanString(customer.name, 120),
      email: cleanString(customer.email, 254).toLowerCase(),
      phone: digits(customer.phone).slice(0, 15),
      document: digits(customer.document).slice(0, 14),
    };
    const normalizedAddress = {
      zipCode: digits(address.zipCode).slice(0, 8),
      street: cleanString(address.street, 160),
      number: cleanString(address.number, 20),
      neighborhood: cleanString(address.neighborhood, 100),
      city: cleanString(address.city, 100),
      state: cleanString(address.state, 2).toUpperCase(),
      complement: cleanString(address.complement, 120),
    };
    if (
      !normalizedCustomer.name ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedCustomer.email) ||
      normalizedCustomer.document.length !== 11 ||
      normalizedCustomer.phone.length < 10
    )
      return response.status(400).json({ error: "Dados pessoais inválidos." });
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
        error:
          "Não foi possível consultar o produto. Tente novamente em instantes.",
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
    const { data: checkoutConfig } = await supabase
      .from("checkout_configs")
      .select("settings,modules")
      .eq("workspace_id", product.workspace_id)
      .maybeSingle();
    const checkoutSettings = checkoutConfig?.settings || {};
    const campaignAttribution =
      checkoutSettings.campaign_attribution_enabled === true
        ? normalizeAttribution(attribution)
        : null;
    const configuredBumpIds = checkoutSettings.order_bump_enabled
      ? (checkoutSettings.order_bump_product_ids || []).filter(
          (id) => id !== product.id,
        )
      : [];
    const requestedBumpIds = [
      ...new Set(
        (Array.isArray(orderBumpProductIds) ? orderBumpProductIds : []).filter(
          (id) => configuredBumpIds.includes(id),
        ),
      ),
    ];
    let bumpProducts = [];
    if (requestedBumpIds.length) {
      const { data } = await supabase
        .from("products")
        .select("id,name,description,price_cents")
        .eq("workspace_id", product.workspace_id)
        .eq("status", "active")
        .in("id", requestedBumpIds);
      bumpProducts = data || [];
    }
    const isPhysical = ["physical", "fisico", "físico"].includes(
      String(product.product_type || "").toLowerCase(),
    );
    if (
      normalizedAddress.zipCode.length !== 8 ||
      !normalizedAddress.street ||
      !normalizedAddress.number ||
      !normalizedAddress.neighborhood ||
      !normalizedAddress.city ||
      !/^[A-Z]{2}$/.test(normalizedAddress.state)
    )
      return response.status(400).json({
        error: isPhysical
          ? "Endereço de entrega inválido."
          : "Endereço de cobrança inválido.",
      });
    const configuredShippingIds = Array.isArray(
      checkoutSettings.checkout_shipping_option_ids,
    )
      ? checkoutSettings.checkout_shipping_option_ids
      : [];
    const availableShippingOptions = isPhysical
      ? (Array.isArray(checkoutSettings.shipping_options)
          ? checkoutSettings.shipping_options
          : []
        )
          .filter(
            (option) =>
              option &&
              option.active !== false &&
              configuredShippingIds.includes(option.id),
          )
          .slice(0, 3)
      : [];
    const shippingOption = availableShippingOptions.find(
      (option) => option.id === shippingOptionId,
    );
    if (availableShippingOptions.length && !shippingOption)
      return response
        .status(400)
        .json({ error: "Selecione uma opção de frete válida." });
    const shippingCents = Math.max(
      0,
      Math.round(Number(shippingOption?.price_cents || 0)),
    );
    const protectionModule = (checkoutConfig?.modules || []).find(
      (module) => module.id === "shopper_protection",
    );
    const protectionCents =
      protectionSelected &&
      isPhysical &&
      checkoutSettings.template === "shopper" &&
      protectionModule?.enabled !== false
        ? brlToCents(checkoutSettings.shopper_protection_price)
        : 0;
    const expectedAmount =
      Number(product.price_cents) +
      shippingCents +
      protectionCents +
      bumpProducts.reduce(
        (total, bump) => total + Number(bump.price_cents || 0),
        0,
      );
    const paymentItems = [
      {
        title: product.name,
        description: product.description || undefined,
        quantity: 1,
        unitPrice: Number(product.price_cents),
      },
      ...bumpProducts.map((bump) => ({
        title: bump.name,
        description: bump.description || "Order bump",
        quantity: 1,
        unitPrice: Number(bump.price_cents),
      })),
      ...(protectionCents
        ? [
            {
              title: "Proteção da compra",
              description: "Proteção adicional selecionada pelo cliente",
              quantity: 1,
              unitPrice: protectionCents,
            },
          ]
        : []),
      ...(shippingOption && shippingCents
        ? [
            {
              title: String(
                shippingOption.title || shippingOption.name || "Frete",
              ).slice(0, 120),
              description: String(
                shippingOption.description ||
                  `${shippingOption.name || "Entrega"} · ${shippingOption.estimate || ""}`,
              ).slice(0, 255),
              quantity: 1,
              unitPrice: shippingCents,
            },
          ]
        : []),
    ];
    const payload = {
      paymentMethod: apiMethod,
      amount: expectedAmount,
      webhookUrl: `${request.headers["x-forwarded-proto"] || "https"}://${request.headers.host}/api/pagamaster/webhook`,
      isPhysicalProduct: isPhysical,
      payerIp: String(
        request.headers["x-forwarded-for"] ||
          request.socket?.remoteAddress ||
          "",
      )
        .split(",")[0]
        .trim(),
      customer: {
        name: normalizedCustomer.name,
        document: normalizedCustomer.document,
        email: normalizedCustomer.email,
        phone: normalizedCustomer.phone,
        address: {
          ...normalizedAddress,
        },
      },
      items: paymentItems,
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
    const customerEmail = normalizedCustomer.email;
    let customerRecord = null;
    if (customerEmail) {
      const existingCustomer = await supabase
        .from("customers")
        .select("id")
        .eq("workspace_id", product.workspace_id)
        .ilike("email", customerEmail)
        .maybeSingle();
      if (existingCustomer.data) {
        const updatedCustomer = await supabase
          .from("customers")
          .update({
            name: normalizedCustomer.name,
            document: normalizedCustomer.document || null,
            phone: normalizedCustomer.phone || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingCustomer.data.id)
          .select("id")
          .single();
        customerRecord = updatedCustomer.data || existingCustomer.data;
      } else {
        const insertedCustomer = await supabase
          .from("customers")
          .insert({
            workspace_id: product.workspace_id,
            name: normalizedCustomer.name,
            email: customerEmail,
            document: normalizedCustomer.document || null,
            phone: normalizedCustomer.phone || null,
          })
          .select("id")
          .single();
        customerRecord = insertedCustomer.data;
        if (!customerRecord) {
          const concurrentCustomer = await supabase
            .from("customers")
            .select("id")
            .eq("workspace_id", product.workspace_id)
            .ilike("email", customerEmail)
            .maybeSingle();
          customerRecord = concurrentCustomer.data;
        }
      }
    }
    const { data: order } = await supabase
      .from("orders")
      .insert({
        workspace_id: product.workspace_id,
        customer_id: customerRecord?.id || null,
        status: normalizedStatus === "APPROVED" ? "approved" : "pending",
        payment_method: apiMethod.toLowerCase(),
        subtotal_cents: expectedAmount,
        total_cents: expectedAmount,
        paid_at:
          normalizedStatus === "APPROVED" ? new Date().toISOString() : null,
        metadata: {
          product_id: product.id,
          order_bump_product_ids: bumpProducts.map((bump) => bump.id),
          protection_selected: protectionCents > 0,
          protection_cents: protectionCents,
          shipping_option_id: shippingOption?.id || null,
          shipping_title: shippingOption?.title || shippingOption?.name || null,
          shipping_description: shippingOption?.description || null,
          shipping_name: shippingOption?.name || null,
          shipping_estimate: shippingOption?.estimate || null,
          shipping_cents: shippingCents,
          gateway: "pagamaster",
          gateway_transaction_id: result.id,
          reference_id: referenceId,
          checkout_session_id: /^[0-9a-f-]{36}$/i.test(
            String(checkoutSessionId || ""),
          )
            ? checkoutSessionId
            : null,
          attribution: campaignAttribution,
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
          amount:
            result.amount == null ? expectedAmount : Number(result.amount),
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
    console.error("Pagamaster payin failed", {
      name: error.name,
      message: error.message,
    });
    return response.status(500).json({
      error: "Não foi possível criar a cobrança. Tente novamente em instantes.",
    });
  }
}
