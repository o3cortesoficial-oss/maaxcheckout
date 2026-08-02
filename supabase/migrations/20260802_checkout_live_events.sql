create table if not exists public.checkout_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  session_id uuid not null,
  event_type text not null,
  payment_method text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists checkout_events_workspace_created_idx
  on public.checkout_events (workspace_id, created_at desc);
create index if not exists checkout_events_session_created_idx
  on public.checkout_events (session_id, created_at);

alter table public.checkout_events enable row level security;
drop policy if exists checkout_events_workspace on public.checkout_events;
create policy checkout_events_workspace on public.checkout_events
  for select using (public.is_workspace_member(workspace_id));

do $$
begin
  alter publication supabase_realtime add table public.checkout_events;
exception
  when duplicate_object then null;
end $$;
