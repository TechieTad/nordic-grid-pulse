-- Nordic Grid Pulse: Supabase schema

create table if not exists public.energy_records (
    timestamp timestamptz primary key,
    consumption_mw numeric not null,
    production_mw numeric not null,
    wind_mw numeric not null,
    solar_mw numeric not null,
    renewable_mw numeric not null,
    renewable_percentage numeric not null,
    balance_mw numeric not null,
    created_at timestamptz default timezone('utc'::text, now()) not null
);

alter table public.energy_records enable row level security;

create policy "Allow public read access"
on public.energy_records
for select
using (true);

-- Note: no write policy. The pipeline writes with the service_role key,
-- which bypasses RLS, so anonymous users can read but not modify.
git 