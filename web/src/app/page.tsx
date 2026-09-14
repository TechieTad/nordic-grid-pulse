import EnergyDashboard, {
  type EnergyRecord,
} from "@/components/EnergyDashboard";

import energyData from "@/data/energy.json";

export default function Home() {
  const records = energyData as EnergyRecord[];

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
            Industrial energy analytics
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
            Nordic Grid Pulse
          </h1>

          <p className="mt-4 max-w-3xl text-slate-300">
            A full-stack data-engineering and energy-monitoring project built
            with Python, Pandas, Next.js and PostgreSQL.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <EnergyDashboard records={records} />
      </div>
    </main>
  );
}
