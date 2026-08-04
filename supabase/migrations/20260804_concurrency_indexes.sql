-- Index the tenant-scoped reads used by the dashboard and checkout APIs.
-- These keep response time stable as each workspace accumulates records.
create index if not exists products_workspace_created_idx on public.products (workspace_id, created_at desc);
create index if not exists customers_workspace_created_idx on public.customers (workspace_id, created_at desc);
create index if not exists payment_links_workspace_created_idx on public.payment_links (workspace_id, created_at desc);
create index if not exists orders_workspace_created_idx on public.orders (workspace_id, created_at desc);
create index if not exists subscriptions_workspace_created_idx on public.subscriptions (workspace_id, created_at desc);
create index if not exists transactions_workspace_created_idx on public.transactions (workspace_id, created_at desc);
create index if not exists payment_gateways_workspace_created_idx on public.payment_gateways (workspace_id, created_at desc);
create index if not exists product_images_workspace_created_idx on public.product_images (workspace_id, created_at desc);
create index if not exists payment_attempts_workspace_created_idx on public.payment_attempts (workspace_id, created_at desc);
create index if not exists checkout_configs_workspace_created_idx on public.checkout_configs (workspace_id, created_at desc);

create index if not exists platform_user_controls_stripe_customer_idx
  on public.platform_user_controls (stripe_customer_id)
  where stripe_customer_id is not null;
