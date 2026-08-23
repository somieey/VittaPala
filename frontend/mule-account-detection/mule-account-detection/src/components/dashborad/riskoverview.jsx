import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const riskData = [
  {
    name: "Critical",
    value: 94,
    color: "#ef4444",
  },
  {
    name: "High",
    value: 286,
    color: "#f59e0b",
  },
  {
    name: "Medium",
    value: 1240,
    color: "#eab308",
  },
  {
    name: "Low",
    value: 10920,
    color: "#22c55e",
  },
];

const totalAccounts = riskData.reduce(
  (total, item) => total + item.value,
  0
);

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className="rounded-xl border border-slate-700 bg-[#0B111B] px-4 py-3 shadow-xl">
      <p className="text-xs font-medium text-slate-400">
        {data.name} Risk
      </p>

      <p className="mt-1 text-lg font-bold text-white">
        {data.value.toLocaleString()}
      </p>

      <p className="mt-1 text-[11px] text-slate-500">
        {((data.value / totalAccounts) * 100).toFixed(1)}% of accounts
      </p>
    </div>
  );
}

function RiskOverview() {
  return (
    <div className="h-full min-h-[360px] rounded-2xl border border-slate-800 bg-[#0B111B] p-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-white">
            Risk Overview
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Account distribution by risk level
          </p>
        </div>

        <span className="rounded-lg border border-slate-800 bg-slate-900/70 px-2.5 py-1 text-[10px] uppercase tracking-wider text-slate-500">
          Live
        </span>
      </div>

      {/* Chart */}
      <div className="relative mt-4 h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={riskData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={92}
              paddingAngle={3}
              stroke="none"
            >
              {riskData.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={entry.color}
                />
              ))}
            </Pie>

            <Tooltip
              content={<CustomTooltip />}
              cursor={false}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Value */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-bold text-white">
            {totalAccounts.toLocaleString()}
          </p>

          <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-slate-500">
            Total Accounts
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-3 border-t border-slate-800 pt-4">
        {riskData.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />

              <span className="text-xs text-slate-400">
                {item.name}
              </span>
            </div>

            <span className="text-xs font-semibold text-slate-300">
              {item.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RiskOverview;