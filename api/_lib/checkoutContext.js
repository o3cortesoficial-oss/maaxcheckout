const productCache = new Map();
const PRODUCT_TTL_MS = 60_000;
const MAX_CACHE_ENTRIES = 1000;

export async function activeCheckoutProduct(supabase, productId) {
  const cached = productCache.get(productId);
  if (cached && cached.expiresAt > Date.now()) return cached.product;
  const { data: product } = await supabase
    .from("products")
    .select("id,workspace_id")
    .eq("id", productId)
    .eq("status", "active")
    .maybeSingle();
  if (productCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = productCache.keys().next().value;
    if (oldest) productCache.delete(oldest);
  }
  if (product) productCache.set(productId, { product, expiresAt: Date.now() + PRODUCT_TTL_MS });
  return product || null;
}
