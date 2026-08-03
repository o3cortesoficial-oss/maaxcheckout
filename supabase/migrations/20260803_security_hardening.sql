-- Defense in depth: RLS remains mandatory even if a future grant is broadened.
alter table if exists public.workspaces force row level security;
alter table if exists public.workspace_members force row level security;
alter table if exists public.products force row level security;
alter table if exists public.product_images force row level security;
alter table if exists public.customers force row level security;
alter table if exists public.payment_links force row level security;
alter table if exists public.checkout_configs force row level security;
alter table if exists public.payment_gateways force row level security;
alter table if exists public.orders force row level security;
alter table if exists public.subscriptions force row level security;
alter table if exists public.transactions force row level security;
alter table if exists public.payment_attempts force row level security;
alter table if exists public.gateway_webhook_events force row level security;
alter table if exists public.checkout_events force row level security;
alter table if exists public.checkout_presence force row level security;
alter table if exists public.checkout_event_counters force row level security;

-- Prevent duplicate financial records when simultaneous webhooks are delivered.
create unique index if not exists transactions_provider_charge_unique
  on public.transactions (provider, provider_reference, type)
  where provider_reference is not null and type = 'charge';

create unique index if not exists checkout_configs_workspace_unique
  on public.checkout_configs (workspace_id);

-- Server-generated audit data must never be writable by browser roles.
revoke insert, update, delete on public.payment_attempts from anon, authenticated;
revoke insert, update, delete on public.gateway_webhook_events from anon, authenticated;
revoke insert, update, delete on public.checkout_events from anon, authenticated;
revoke insert, update, delete on public.checkout_presence from anon, authenticated;
revoke insert, update, delete on public.checkout_event_counters from anon, authenticated;

-- Explicitly keep audit visibility limited to authenticated users; RLS narrows it
-- further to members of the matching workspace.
revoke all on public.payment_attempts from anon;
revoke all on public.gateway_webhook_events from anon;
revoke all on public.checkout_events from anon;
revoke all on public.checkout_presence from anon;
revoke all on public.checkout_event_counters from anon;
grant select on public.payment_attempts to authenticated;
grant select on public.gateway_webhook_events to authenticated;
grant select on public.checkout_events to authenticated;
grant select on public.checkout_presence to authenticated;
grant select on public.checkout_event_counters to authenticated;
