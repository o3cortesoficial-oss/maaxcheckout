create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  gateway_id uuid references public.payment_gateways(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  reference_id text not null unique,
  gateway_transaction_id text unique,
  payment_method text not null,
  expected_amount_cents bigint not null check (expected_amount_cents >= 0),
  gateway_amount_cents bigint,
  status text not null default 'creating',
  risk_status text not null default 'clear' check (risk_status in ('clear', 'suspected')),
  risk_reasons jsonb not null default '[]'::jsonb,
  gateway_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  last_webhook_at timestamptz
);

create table if not exists public.gateway_webhook_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  payment_attempt_id uuid not null references public.payment_attempts(id) on delete cascade,
  gateway_transaction_id text not null,
  reported_status text,
  verified_status text,
  reported_amount_cents bigint,
  verified_amount_cents bigint,
  is_verified boolean not null default false,
  risk_reasons jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  unique (gateway_transaction_id, reported_status, received_at)
);

create index if not exists payment_attempts_workspace_created_idx
  on public.payment_attempts (workspace_id, created_at desc);
create index if not exists payment_attempts_gateway_transaction_idx
  on public.payment_attempts (gateway_transaction_id);
create index if not exists payment_attempts_risk_idx
  on public.payment_attempts (workspace_id, risk_status, status);
create index if not exists gateway_webhook_events_attempt_idx
  on public.gateway_webhook_events (payment_attempt_id, received_at desc);

alter table public.payment_attempts enable row level security;
alter table public.gateway_webhook_events enable row level security;

drop policy if exists payment_attempts_workspace on public.payment_attempts;
create policy payment_attempts_workspace on public.payment_attempts
  for select using (public.is_workspace_member(workspace_id));

drop policy if exists gateway_webhook_events_workspace on public.gateway_webhook_events;
create policy gateway_webhook_events_workspace on public.gateway_webhook_events
  for select using (public.is_workspace_member(workspace_id));
