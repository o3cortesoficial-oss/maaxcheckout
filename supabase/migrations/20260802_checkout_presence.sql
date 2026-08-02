create table if not exists public.checkout_presence (
  session_id uuid primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  opened_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists checkout_presence_workspace_seen_idx
  on public.checkout_presence (workspace_id, last_seen_at desc);

alter table public.checkout_presence enable row level security;
drop policy if exists checkout_presence_workspace on public.checkout_presence;
create policy checkout_presence_workspace on public.checkout_presence
  for select using (public.is_workspace_member(workspace_id));

do $$
begin
  alter publication supabase_realtime add table public.checkout_presence;
exception
  when duplicate_object then null;
end $$;
