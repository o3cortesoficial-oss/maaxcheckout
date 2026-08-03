create or replace function public.create_business_workspace(p_name text)
returns public.workspaces
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_name text := trim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  slug_base text;
  new_workspace public.workspaces;
begin
  if auth.uid() is null then
    raise exception 'Sessão inválida.';
  end if;
  if char_length(clean_name) < 2 or char_length(clean_name) > 60 then
    raise exception 'Use um nome entre 2 e 60 caracteres.';
  end if;

  slug_base := trim(both '-' from regexp_replace(lower(clean_name), '[^a-z0-9]+', '-', 'g'));
  if slug_base = '' then slug_base := 'negocio'; end if;

  insert into public.workspaces (name, slug, owner_id)
  values (clean_name, slug_base || '-' || left(gen_random_uuid()::text, 8), auth.uid())
  returning * into new_workspace;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace.id, auth.uid(), 'owner')
  on conflict on constraint workspace_members_pkey
  do update set role = excluded.role;

  return new_workspace;
end;
$$;

revoke all on function public.create_business_workspace(text) from public;
grant execute on function public.create_business_workspace(text) to authenticated;
