import Link from "next/link";

import EnergyDashboard, {
  type EnergyRecord,
} from "@/components/EnergyDashboard";

import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type SearchParams = { from?: string; to?: string };

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { from, to } = await searchParams;

  let query = supabase
    .from("energy_records")
    .select("*")
    .order("timestamp", { ascending: true });

  if (from) {
    query = query.gte("timestamp", from + "T00:00:00Z");
  }
  if (to) {
    query = query.lte("timestamp", to + "T23:59:59Z");
  }

  const { data, error } = await query;

  if (error) {
    console.error("Supabase read error:", error);
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-slate-700">
          Unable to load energy data. Please try again later.
        </p>
      </main>
    );
  }

  const records = (data ?? []) as EnergyRecord[];
  const isFiltered = Boolean(from || to);

  let summary = "";
  if (isFiltered) {
    summary =
      "Showing " +
      records.length.toLocaleString("en-FI") +
      " records" +
      (from ? " from " + from : "") +
      (to ? " to " + to : "") +
      ".";
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <p className="text-sm font-medium text-slate-600">
          Industrial energy analytics
        </p>
        <h1 className="text-3xl font-bold text-slate-950">Nordic Grid Pulse</h1>
        <p className="mt-2 text-slate-600">
          A full-stack data-engineering and energy-monitoring project built with
          Python, Pandas, Next.js and PostgreSQL.
        </p>
        <p className="mt-4 text-sm">
          <Link className="font-medium text-blue-700 underline" href="/status">
            View pipeline status →
          </Link>
        </p>

        <form
          action="/"
          method="get"
          className="mt-4 flex flex-wrap items-center gap-3 text-sm"
        >
          <label className="flex items-center gap-1 text-slate-700">
            From
            <input
              type="date"
              name="from"
              defaultValue={from ?? ""}
              className="rounded-md border border-slate-300 px-2 py-1"
            />
          </label>
          <label className="flex items-center gap-1 text-slate-700">
            To
            <input
              type="date"
              name="to"
              defaultValue={to ?? ""}
              className="rounded-md border border-slate-300 px-2 py-1"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-3 py-1 font-medium text-white"
          >
            Apply
          </button>
          {isFiltered ? (
            <Link className="font-medium text-blue-700 underline" href="/">
              Clear
            </Link>
          ) : null}
        </form>

        {isFiltered ? (
          <p className="mt-2 text-sm text-slate-500">{summary}</p>
        ) : null}
      </header>

      {isFiltered && records.length === 0 ? (
        <p className="rounded-xl bg-amber-50 p-4 text-amber-900">
          No records in this date range.
        </p>
      ) : (
        <EnergyDashboard records={records} />
      )}
    </main>
  );
}
