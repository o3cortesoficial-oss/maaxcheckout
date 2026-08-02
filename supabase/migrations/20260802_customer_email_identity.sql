create unique index if not exists customers_workspace_email_unique
  on public.customers (workspace_id, lower(email));
