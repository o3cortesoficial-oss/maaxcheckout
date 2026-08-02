alter table public.checkout_presence
  add column if not exists stage text not null default 'checkout_opened';

create index if not exists checkout_presence_workspace_stage_seen_idx
  on public.checkout_presence (workspace_id, stage, last_seen_at desc);
