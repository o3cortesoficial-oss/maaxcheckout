-- Shopify-style product organization and automated collections.
alter table public.products
  add column if not exists category text,
  add column if not exists vendor text,
  add column if not exists taxable boolean not null default true,
  add column if not exists requires_shipping boolean not null default false,
  add column if not exists weight_value numeric(12,3),
  add column if not exists weight_unit text not null default 'kg',
  add column if not exists continue_selling boolean not null default false,
  add column if not exists sales_channels text[] not null default array['checkout']::text[],
  add column if not exists product_options jsonb not null default '[]'::jsonb;

create table if not exists public.product_collections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  handle text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'draft')),
  collection_type text not null default 'automated' check (collection_type in ('automated', 'manual')),
  match_type text not null default 'any' check (match_type in ('any', 'all')),
  conditions jsonb not null default '[]'::jsonb,
  product_ids uuid[] not null default '{}'::uuid[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, handle)
);

alter table public.product_collections enable row level security;
alter table public.product_collections force row level security;

drop policy if exists product_collections_select_member on public.product_collections;
create policy product_collections_select_member on public.product_collections
for select to authenticated using (public.is_workspace_member(workspace_id));

drop policy if exists product_collections_insert_member on public.product_collections;
create policy product_collections_insert_member on public.product_collections
for insert to authenticated with check (public.is_workspace_member(workspace_id));

drop policy if exists product_collections_update_member on public.product_collections;
create policy product_collections_update_member on public.product_collections
for update to authenticated using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists product_collections_delete_member on public.product_collections;
create policy product_collections_delete_member on public.product_collections
for delete to authenticated using (public.is_workspace_member(workspace_id));

grant select, insert, update, delete on public.product_collections to authenticated;
revoke all on public.product_collections from anon;

create index if not exists product_collections_workspace_updated_idx
  on public.product_collections (workspace_id, updated_at desc);

create or replace function public.touch_product_collection_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists product_collections_touch_updated_at on public.product_collections;
create trigger product_collections_touch_updated_at
before update on public.product_collections
for each row execute function public.touch_product_collection_updated_at();
