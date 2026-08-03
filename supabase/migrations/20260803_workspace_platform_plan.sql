alter table public.workspaces
  add column if not exists platform_plan text not null default 'essential'
    check (platform_plan in ('essential', 'growth', 'scale')),
  add column if not exists billing_anchor_at timestamptz not null default now();
