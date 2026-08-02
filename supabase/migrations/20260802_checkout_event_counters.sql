create table if not exists public.checkout_event_counters (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  event_type text not null,
  total bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, event_type)
);

alter table public.checkout_event_counters enable row level security;
drop policy if exists checkout_event_counters_workspace on public.checkout_event_counters;
create policy checkout_event_counters_workspace on public.checkout_event_counters
  for select using (public.is_workspace_member(workspace_id));

insert into public.checkout_event_counters (workspace_id, event_type, total, updated_at)
select workspace_id, event_type, count(*), max(created_at)
from public.checkout_events
group by workspace_id, event_type
on conflict (workspace_id, event_type) do update
set total = excluded.total, updated_at = excluded.updated_at;

create or replace function public.increment_checkout_event_counter()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.checkout_event_counters (workspace_id, event_type, total, updated_at)
  values (new.workspace_id, new.event_type, 1, now())
  on conflict (workspace_id, event_type) do update
  set total = checkout_event_counters.total + 1,
      updated_at = now();
  return new;
end;
$$;

drop trigger if exists checkout_event_counter_after_insert on public.checkout_events;
create trigger checkout_event_counter_after_insert
after insert on public.checkout_events
for each row execute function public.increment_checkout_event_counter();

do $$
begin
  alter publication supabase_realtime add table public.checkout_event_counters;
exception
  when duplicate_object then null;
end $$;
