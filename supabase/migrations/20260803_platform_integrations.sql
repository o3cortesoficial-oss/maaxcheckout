create table if not exists public.platform_integrations (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique,
  display_name text not null,
  status text not null default 'inactive' check (status in ('active', 'inactive')),
  encrypted_config text not null,
  configured_by uuid references auth.users(id) on delete set null,
  last_tested_at timestamptz,
  last_test_status text not null default 'never' check (last_test_status in ('never', 'success', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.platform_integrations enable row level security;
alter table public.platform_integrations force row level security;
revoke all on table public.platform_integrations from anon, authenticated;
