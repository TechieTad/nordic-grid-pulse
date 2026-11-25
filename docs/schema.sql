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

-- ---------------------------------------------------------------------------
-- pipeline_runs
-- One row per execution of fetch_fingrid.py / load_supabase.py.
-- Written by the pipeline itself; read by the /status page.
-- ---------------------------------------------------------------------------
create table if not exists public.pipeline_runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('success', 'partial', 'error')),
  fetched_count integer not null default 0,
  written_count integer not null default 0,
  dropped_count integer not null default 0,
  error_message text
);

alter table public.pipeline_runs enable row level security;

create policy "Allow public read access to pipeline_runs"
  on public.pipeline_runs
  for select
  to anon, authenticated
  using (true);
