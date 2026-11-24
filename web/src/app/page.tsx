import EnergyDashboard, {
  type EnergyRecord,
} from "@/components/EnergyDashboard";

import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { data, error } = await supabase
    .from("energy_records")
    .select("*")
    .order("timestamp", { ascending: true });

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

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8">
        <p className="text-sm font-medium text-slate-600">
          Industrial energy analytics
        </p>
        <h1 className="text-3xl font-bold text-slate-950">
          Nordic Grid Pulse
        </h1>
        <p className="mt-2 text-slate-600">
          A full-stack data-engineering and energy-monitoring project built
          with Python, Pandas, Next.js and PostgreSQL.
        </p>
      </header>

      <EnergyDashboard records={records} />
    </main>
  );
}
