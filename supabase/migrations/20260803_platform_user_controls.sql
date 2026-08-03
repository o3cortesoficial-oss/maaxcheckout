create table if not exists public.platform_user_controls (
  user_id uuid primary key references auth.users(id) on delete cascade,
  account_type text not null default 'standard' check (account_type in ('standard', 'partner')),
  access_status text not null default 'active' check (access_status in ('active', 'blocked')),
  block_reason text,
  subscription_status text not null default 'not_started',
  plan_name text,
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.platform_user_controls enable row level security;
alter table public.platform_user_controls force row level security;
revoke all on table public.platform_user_controls from anon, authenticated;

create index if not exists platform_user_controls_access_idx
  on public.platform_user_controls (access_status, account_type);
