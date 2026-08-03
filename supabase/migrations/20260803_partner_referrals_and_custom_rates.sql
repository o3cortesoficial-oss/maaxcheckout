alter table public.platform_user_controls
  add column if not exists custom_fixed_cents integer check (custom_fixed_cents >= 0),
  add column if not exists custom_rate_percent numeric(6,3) check (custom_rate_percent >= 0 and custom_rate_percent <= 100),
  add column if not exists partner_code text unique,
  add column if not exists referred_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists referred_at timestamptz;

create table if not exists public.partner_commissions (
  id uuid primary key default gen_random_uuid(),
  partner_user_id uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid not null references auth.users(id) on delete cascade,
  stripe_invoice_id text not null unique,
  gross_platform_revenue_cents integer not null check (gross_platform_revenue_cents >= 0),
  commission_cents integer not null check (commission_cents >= 0),
  status text not null default 'pending' check (status in ('pending','paid','cancelled')),
  created_at timestamptz not null default now()
);

alter table public.partner_commissions enable row level security;
revoke all on public.partner_commissions from anon, authenticated;
create index if not exists partner_commissions_partner_idx on public.partner_commissions(partner_user_id, created_at desc);
create index if not exists platform_user_controls_referrer_idx on public.platform_user_controls(referred_by_user_id);
