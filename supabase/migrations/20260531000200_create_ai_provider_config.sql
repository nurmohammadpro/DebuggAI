-- Admin-managed AI provider configuration.
-- Stores API key server-side; only admins (or service role) can read/update.

create table if not exists public.ai_provider_config (
  key text primary key,
  enabled boolean not null default true,
  base_url text not null,
  model text not null,
  api_key text,
  api_key_last4 text,
  updated_at timestamptz not null default now()
);

alter table public.ai_provider_config enable row level security;

-- Only admins can read the configuration.
drop policy if exists "ai_provider_config_admin_read" on public.ai_provider_config;
create policy "ai_provider_config_admin_read"
on public.ai_provider_config
for select
to authenticated
using (public.is_admin(auth.uid()));

-- Only admins can update/insert.
drop policy if exists "ai_provider_config_admin_write" on public.ai_provider_config;
create policy "ai_provider_config_admin_write"
on public.ai_provider_config
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

-- Seed a default row (safe defaults, no key).
insert into public.ai_provider_config (key, enabled, base_url, model, api_key, api_key_last4)
values ('primary', true, 'https://api.deepseek.com/v1', 'deepseek-chat', null, null)
on conflict (key) do nothing;

