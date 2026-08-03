alter table public.workspaces
  add column if not exists billing_suspended boolean not null default false;

create index if not exists workspaces_billing_suspended_idx
  on public.workspaces (billing_suspended)
  where billing_suspended = true;
