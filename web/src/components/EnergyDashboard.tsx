"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type EnergyRecord = {
  timestamp: string;
  consumption_mw: number;
  production_mw: number;
  wind_mw: number;
  solar_mw: number;
  renewable_mw: number;
  renewable_percentage: number;
  balance_mw: number;
};

type EnergyDashboardProps = {
  records: EnergyRecord[];
};

function formatTime(timestamp: string): string {
  return new Intl.DateTimeFormat("en-FI", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Helsinki",
  }).format(new Date(timestamp));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-FI", {
    maximumFractionDigits: 1,
  }).format(value);
}

export default function EnergyDashboard({
  records,
}: EnergyDashboardProps) {
  if (records.length === 0) {
    return (
      <p className="rounded-xl bg-white p-6 text-slate-700 shadow">
        No energy records are available.
      </p>
    );
  }

  const latest = records[records.length - 1];

  const chartData = records.map((record) => ({
    ...record,
    displayTime: formatTime(record.timestamp),
  }));

  const balanceLabel =
    latest.balance_mw >= 0 ? "Production surplus" : "Production deficit";

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Consumption"
          value={`${formatNumber(latest.consumption_mw)} MW`}
          description="Latest system consumption"
        />

        <MetricCard
          title="Production"
          value={`${formatNumber(latest.production_mw)} MW`}
          description="Latest system production"
        />

                <MetricCard
          title="Wind + solar"
          value={`${formatNumber(latest.renewable_percentage)}%`}
          description={`${formatNumber(latest.renewable_mw)} MW — solar is a forecast`}
        />

        <MetricCard
          title={balanceLabel}
          value={`${formatNumber(Math.abs(latest.balance_mw))} MW`}
          description="Production minus consumption"
          warning={latest.balance_mw < 0}
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-slate-950">
            Finnish electricity balance
          </h2>

                    <p className="mt-1 text-sm text-slate-600">
            Live data from the Fingrid Open Data API. Solar values are a
            forecast.
          </p>
        </div>

        <div className="h-[420px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />

              <XAxis
                dataKey="displayTime"
                tick={{ fill: "#475569", fontSize: 12 }}
              />

              <YAxis
                unit=" MW"
                tick={{ fill: "#475569", fontSize: 12 }}
                width={85}
              />

              <Tooltip />
              <Legend />

              <Line
                type="monotone"
                dataKey="consumption_mw"
                name="Consumption"
                stroke="#dc2626"
                strokeWidth={3}
                dot={false}
              />

              <Line
                type="monotone"
                dataKey="production_mw"
                name="Production"
                stroke="#2563eb"
                strokeWidth={3}
                dot={false}
              />

              <Line
                type="monotone"
                dataKey="renewable_mw"
                name="Wind + solar"
                stroke="#16a34a"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-xl font-semibold text-slate-950">
            Processed records
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-5 py-3 font-semibold">Time</th>
                <th className="px-5 py-3 font-semibold">Consumption</th>
                <th className="px-5 py-3 font-semibold">Production</th>
                <th className="px-5 py-3 font-semibold">Renewables</th>
                <th className="px-5 py-3 font-semibold">Balance</th>
              </tr>
            </thead>

            <tbody>
              {records.map((record) => (
                <tr
                  key={record.timestamp}
                  className="border-t border-slate-200"
                >
                  <td className="whitespace-nowrap px-5 py-3">
                    {formatTime(record.timestamp)}
                  </td>

                  <td className="whitespace-nowrap px-5 py-3">
                    {formatNumber(record.consumption_mw)} MW
                  </td>

                  <td className="whitespace-nowrap px-5 py-3">
                    {formatNumber(record.production_mw)} MW
                  </td>

                  <td className="whitespace-nowrap px-5 py-3">
                    {formatNumber(record.renewable_percentage)}%
                  </td>

                  <td
                    className={`whitespace-nowrap px-5 py-3 font-medium ${
                      record.balance_mw < 0
                        ? "text-red-700"
                        : "text-green-700"
                    }`}
                  >
                    {formatNumber(record.balance_mw)} MW
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

type MetricCardProps = {
  title: string;
  value: string;
  description: string;
  warning?: boolean;
};

function MetricCard({
  title,
  value,
  description,
  warning = false,
}: MetricCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-600">{title}</p>

      <p
        className={`mt-2 text-3xl font-bold ${
          warning ? "text-red-700" : "text-slate-950"
        }`}
      >
        {value}
      </p>

      <p className="mt-2 text-sm text-slate-500">{description}</p>
    </article>
  );
}
