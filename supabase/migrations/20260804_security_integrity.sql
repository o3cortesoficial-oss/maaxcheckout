-- Reproducible membership boundary used by all workspace RLS policies.
create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    exists (select 1 from public.workspaces w where w.id = p_workspace_id and w.owner_id = auth.uid())
    or exists (select 1 from public.workspace_members wm where wm.workspace_id = p_workspace_id and wm.user_id = auth.uid())
  );
$$;
revoke all on function public.is_workspace_member(uuid) from public, anon;
grant execute on function public.is_workspace_member(uuid) to authenticated;

-- Sensitive platform and financial tables are never exposed to anonymous roles.
alter table if exists public.platform_user_controls force row level security;
alter table if exists public.platform_integrations force row level security;
alter table if exists public.partner_commissions force row level security;
revoke all on table public.platform_user_controls from anon, authenticated;
revoke all on table public.platform_integrations from anon, authenticated;
revoke all on table public.partner_commissions from anon;

-- Server-side storage constraints remain effective even if client checks are bypassed.
update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/png','image/jpeg','image/webp','image/svg+xml']
where id = 'checkout-assets';

update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/png','image/jpeg','image/webp']
where id = 'product-images';
