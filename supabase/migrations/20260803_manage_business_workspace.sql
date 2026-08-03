alter table public.workspaces
  add column if not exists logo_url text;

create or replace function public.delete_business_workspace(p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  owned_count integer;
begin
  if auth.uid() is null then
    raise exception 'Sessão inválida.';
  end if;
  if not exists (select 1 from public.workspaces where id = p_workspace_id and owner_id = auth.uid()) then
    raise exception 'Negócio não encontrado ou sem permissão.';
  end if;
  select count(*) into owned_count from public.workspaces where owner_id = auth.uid();
  if owned_count <= 1 then
    raise exception 'Crie outro negócio antes de excluir o único existente.';
  end if;
  delete from public.workspaces where id = p_workspace_id and owner_id = auth.uid();
end;
$$;

revoke all on function public.delete_business_workspace(uuid) from public;
grant execute on function public.delete_business_workspace(uuid) to authenticated;
