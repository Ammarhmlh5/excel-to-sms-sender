create extension if not exists pgcrypto;

create table if not exists public.allowed_company_domains (
  id uuid primary key default gen_random_uuid(),
  domain text not null unique,
  company_name text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_allowed_company_domains_updated_at on public.allowed_company_domains;
create trigger trg_allowed_company_domains_updated_at
before update on public.allowed_company_domains
for each row execute function public.set_updated_at();

alter table public.allowed_company_domains enable row level security;

create policy "Allow authenticated users to view active company domains"
  on public.allowed_company_domains
  for select
  using (auth.uid() is not null and is_active = true);

create policy "Allow admins to manage company domains"
  on public.allowed_company_domains
  for insert
  with check (auth.uid() is not null and public.has_role(auth.uid(), 'admin'));

create policy "Allow admins to update company domains"
  on public.allowed_company_domains
  for update
  using (auth.uid() is not null and public.has_role(auth.uid(), 'admin'))
  with check (auth.uid() is not null and public.has_role(auth.uid(), 'admin'));

create policy "Allow admins to delete company domains"
  on public.allowed_company_domains
  for delete
  using (auth.uid() is not null and public.has_role(auth.uid(), 'admin'));
