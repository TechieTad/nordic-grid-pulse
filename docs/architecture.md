# Nordic Grid Pulse — Architecture

A full-stack data-engineering project that ingests Finnish electricity data from the
Fingrid Open Data API into Supabase (PostgreSQL) and visualises it in a Next.js
dashboard. The pipeline runs automatically every hour via GitHub Actions; the app
is deployed on Vercel.

Live app: https://nordic-grid-pulse.vercel.app
Status page: https://nordic-grid-pulse.vercel.app/status

## Data flow

Fingrid Open Data API GitHub Actions (cron, hourly)
datasets 124/74/75/248 │
│ ▼
│ pipeline/fetch_fingrid.py (raw fetch, pagination)
│ pipeline/transform.py (validate, join, derive)
│ │
│ ▼
│ web/src/data/energy.json ← runtime handoff, gitignored
│ │
│ ▼
│ pipeline/load_supabase.py (upsert + run receipt)
│ │
▼ ▼
Supabase PostgreSQL ◄──────────────────────────────────────────
energy_records (15-min rows: consumption, production, wind, solar)
pipeline_runs (one receipt per pipeline run)
│
│ publishable key (sb_publishable_...), RLS: public read-only
▼
Next.js 16 App Router (web/) ──deployed on──► Vercel
/ dashboard (force-dynamic)
/status health & data-quality page (force-dynamic)


## Pipeline (Python, `pipeline/`)

| File | Role |
|---|---|
| `fetch_fingrid.py` | Downloads the last 24 h from four 15-minute Fingrid datasets (consumption=124, production=74, wind=75, solar=248 — solar is a **forecast**), paginates at 1000 rows/page, rate-limits to ~1 request / 2.5 s, writes the raw join to `data/fingrid_latest.json` and the transformed records to `web/src/data/energy.json`. Also writes the run's real fetched/dropped counts to `data/fingrid_run_stats.json`. |
| `transform.py` | Validation + inner-join of the four series on timestamp; derives the dashboard columns. Rows missing from any dataset are dropped (inner join). |
| `load_supabase.py` | Upserts `energy.json` into `energy_records` (`on_conflict="timestamp"`), then writes one row to `pipeline_runs` with status (`success` / `partial` if rows were dropped / `error`), fetched/written/dropped counts and timestamps. |

`data/` and `web/src/data/energy.json` are **runtime artifacts** — produced on every run, ignored by git. The source of truth is Supabase, not the JSON file.

## Web app (Next.js, `web/`)

- **App Router, both routes `force-dynamic`** — every request queries Supabase fresh; nothing is baked in at build time (verified by `ƒ /` and `ƒ /status` in `npm run build`).
- `/` renders `EnergyDashboard` with all records, optionally filtered by `?from=YYYY-MM-DD&to=YYYY-MM-DD` (server-side via `searchParams`).
- `/status` shows a health banner plus stat cards computed from `energy_records` (row counts, newest/oldest reading, data age) and the latest row of `pipeline_runs`.
- DB access goes through a single helper, `web/src/lib/supabase.ts`.

## Database (Supabase)

Authoritative definitions live in `docs/schema.sql`.

- **`energy_records`** — one row per 15-minute timestamp: `timestamp` (unique, upsert key), `consumption_mw`, `production_mw`, `wind_mw`, `solar_mw`, `created_at`.
- **`pipeline_runs`** — `id`, `started_at`, `finished_at`, `status` (`check in ('success','partial','error')`), `fetched_count`, `written_count`, `dropped_count`, `error_message`.

Both tables have **row-level security enabled** with a public **read-only** policy for the anon role.

## Security model — which key lives where

| Key | Used by | Lives in |
|---|---|---|
| `sb_publishable_...` (anon) | web app (`web/.env.local`, and as `SUPABASE_ANON_KEY` in Vercel env) | safe to expose; RLS limits it to reads |
| `sb_secret_...` | Python pipeline (`pipeline/.env`, and as `SUPABASE_KEY` in GitHub Actions secrets) | **never** in the web app, browser bundles, or git |
| `FINGRID_API_KEY` | `fetch_fingrid.py` | `pipeline/.env` + GitHub Actions secret |

`.env*` is gitignored; only the empty templates `.env.example` are committed. Verified with `git check-ignore -v .env.local` and `git ls-files | Select-String env`.

## Automation & deployment

- **GitHub Actions** — `.github/workflows/ingest.yml`, runs `fetch_fingrid.py` then `load_supabase.py` every hour (`cron: "15 * * * *"`) plus on manual dispatch. Secrets: `FINGRID_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`.
- **Vercel** — project root directory set to `web/`; env vars `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Every push to `main` redeploys automatically.

## Local development

```powershell
# pipeline
cd pipeline
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python fetch_fingrid.py
python load_supabase.py

# web (separate terminal) — use port 3000
cd web
npm install
npm run dev        # http://localhost:3000
npm run lint
npm run build      # route table must show ƒ / and ƒ /status

Data quality & freshness

/status classifies health from the newest reading's age: Healthy ≤ 45 min, Delayed ≤ 180 min, Stale beyond that (Fingrid publishes 15-minute series; 45 min = 3 intervals of tolerance). The "Last pipeline run" card reports the actual run outcome from pipeline_runs, including dropped-row counts

Repository layout

nordic-grid-pulse/
├── .github/workflows/ingest.yml   # hourly automation
├── docs/
│   ├── schema.sql                 # authoritative DB schema
│   └── architecture.md           # this file
├── pipeline/
│   ├── fetch_fingrid.py
│   ├── transform.py
│   ├── load_supabase.py
│   ├── requirements.txt
│   └── .env  (gitignored) + .env.example
├── web/                           # Next.js app (Vercel root directory)
│   ├── src/app/page.tsx           # / dashboard, ?from&to filter
│   ├── src/app/status/page.tsx    # /status
│   ├── src/components/EnergyDashboard.tsx
│   ├── src/lib/supabase.ts
│   └── .env.local (gitignored) + .env.example
└── data/                          # runtime artifacts (gitignored)
