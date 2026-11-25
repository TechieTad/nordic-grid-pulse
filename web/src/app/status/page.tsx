/* eslint-disable react-hooks/purity -- Server Component: Date.now() runs once per request */
import Link from "next/link";

import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const STALE_AFTER_MINUTES = 45;
const OFFLINE_AFTER_MINUTES = 180;

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-FI", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Helsinki",
  }).format(new Date(value));
}

function formatAge(value: string | null): string {
  if (!value) return "—";
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} h ${minutes % 60} min ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

export default async function StatusPage() {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [total, latest, earliest, recent] = await Promise.all([
    supabase.from("energy_records").select("*", { count: "exact", head: true }),
    supabase
      .from("energy_records")
      .select("timestamp, created_at")
      .order("timestamp", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("energy_records")
      .select("timestamp")
      .order("timestamp", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("energy_records")
      .select("*", { count: "exact", head: true })
      .gte("timestamp", since24h),
  ]);

  const firstError =
    total.error ?? latest.error ?? earliest.error ?? recent.error;

  if (firstError) {
    console.error("Status query error:", firstError);
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-950">Pipeline status</h1>
        <p className="mt-3 rounded-xl bg-red-50 p-4 text-red-800">
          Could not read pipeline statistics: {firstError.message}
        </p>
      </main>
    );
  }

  const lastTimestamp = latest.data?.timestamp ?? null;
  const lastIngestedAt = latest.data?.created_at ?? null;
  const firstTimestamp = earliest.data?.timestamp ?? null;

  const ageMinutes = lastTimestamp
    ? (Date.now() - new Date(lastTimestamp).getTime()) / 60_000
    : Number.POSITIVE_INFINITY;

  const health =
    ageMinutes <= STALE_AFTER_MINUTES
      ? {
          label: "Healthy",
          tone: "bg-emerald-50 text-emerald-800 border-emerald-200",
          detail: "The newest reading is recent enough to trust.",
        }
      : ageMinutes <= OFFLINE_AFTER_MINUTES
        ? {
            label: "Delayed",
            tone: "bg-amber-50 text-amber-900 border-amber-200",
            detail:
              "Data is older than the 15-minute update interval plus tolerance. The pipeline may be running late.",
          }
        : {
            label: "Stale",
            tone: "bg-red-50 text-red-800 border-red-200",
            detail:
              "No new readings for more than three hours. The ingestion has probably stopped.",
          };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8">
        <p className="text-sm font-medium text-slate-600">
          Data quality and pipeline health
        </p>
        <h1 className="text-3xl font-bold text-slate-950">Pipeline status</h1>
        <p className="mt-2 text-slate-600">
          Measured from the <code>energy_records</code> table in Supabase.
          Source: Fingrid Open Data API (15-minute datasets).
        </p>
        <p className="mt-4 text-sm">
          <Link className="font-medium text-blue-700 underline" href="/">
            ← Back to dashboard
          </Link>
        </p>
      </header>

      <section className={`mb-8 rounded-2xl border p-5 ${health.tone}`}>
        <p className="text-sm font-semibold uppercase tracking-wide">
          {health.label}
        </p>
        <p className="mt-1 text-sm">{health.detail}</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Stat
          label="Records stored"
          value={total.count?.toLocaleString("en-FI") ?? "0"}
          hint="Total rows in energy_records"
        />
        <Stat
          label="Records, last 24 h"
          value={recent.count?.toLocaleString("en-FI") ?? "0"}
          hint="Expected ≈ 96 at 15-minute resolution"
        />
        <Stat
          label="Newest reading"
          value={formatDateTime(lastTimestamp)}
          hint={formatAge(lastTimestamp)}
        />
        <Stat
          label="Oldest reading"
          value={formatDateTime(firstTimestamp)}
          hint="History available for filtering"
        />
        <Stat
          label="Last ingestion"
          value={formatDateTime(lastIngestedAt)}
          hint={formatAge(lastIngestedAt)}
        />
        <Stat
          label="Data age"
          value={
            Number.isFinite(ageMinutes) ? `${Math.round(ageMinutes)} min` : "—"
          }
          hint={`Alert above ${STALE_AFTER_MINUTES} min`}
        />
      </section>

      <p className="mt-8 text-sm text-slate-500">
        All times shown in Europe/Helsinki. Drop counts and per-run errors
        require the <code>pipeline_runs</code> table.
      </p>
    </main>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{hint}</p>
    </article>
  );
}
