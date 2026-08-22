import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const trendData = [
  { day: "Mon", suspicious: 42, critical: 8 },
  { day: "Tue", suspicious: 55, critical: 11 },
  { day: "Wed", suspicious: 48, critical: 9 },
  { day: "Thu", suspicious: 72, critical: 16 },
  { day: "Fri", suspicious: 68, critical: 14 },
  { day: "Sat", suspicious: 91, critical: 21 },
  { day: "Sun", suspicious: 84, critical: 19 },
];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-700 bg-[#0B111C] px-4 py-3 shadow-xl">
      <p className="mb-2 text-xs font-semibold text-slate-300">
        {label}
      </p>

      {payload.map((item) => (
        <div
          key={item.dataKey}
          className="flex items-center justify-between gap-6"
        >
          <span className="text-[11px] text-slate-500">
            {item.dataKey === "suspicious"
              ? "Suspicious"
              : "Critical"}
          </span>

          <span className="text-xs font-semibold text-white">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function RiskTrendChart() {
  return (
    <div className="h-full min-h-[360px] rounded-2xl border border-slate-800 bg-[#0B111C] p-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-white">
            Risk Activity Trend
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Suspicious account activity detected over the last 7 days
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span className="text-[11px] text-slate-500">
              Suspicious
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            <span className="text-[11px] text-slate-500">
              Critical
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="mt-6 h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={trendData}
            margin={{
              top: 10,
              right: 10,
              left: -20,
              bottom: 0,
            }}
          >
            <CartesianGrid
              stroke="#1E293B"
              strokeDasharray="3 3"
              vertical={false}
            />

            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "#64748B",
                fontSize: 11,
              }}
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{
                fill: "#64748B",
                fontSize: 11,
              }}
            />

            <Tooltip
              content={<CustomTooltip />}
              cursor={{
                stroke: "#334155",
                strokeDasharray: "4 4",
              }}
            />

            <Line
              type="monotone"
              dataKey="suspicious"
              stroke="#22D3EE"
              strokeWidth={2.5}
              dot={{
                r: 3,
                fill: "#22D3EE",
                strokeWidth: 0,
              }}
              activeDot={{
                r: 5,
                fill: "#22D3EE",
                stroke: "#0B111C",
                strokeWidth: 2,
              }}
            />

            <Line
              type="monotone"
              dataKey="critical"
              stroke="#F87171"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={{
                r: 3,
                fill: "#F87171",
                strokeWidth: 0,
              }}
              activeDot={{
                r: 5,
                fill: "#F87171",
                stroke: "#0B111C",
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom insight */}
      <div className="border-t border-slate-800 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-slate-600">
              Security Insight
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Suspicious activity increased during the weekend.
            </p>
          </div>

          <span className="rounded-lg bg-red-400/10 px-2.5 py-1 text-[10px] font-semibold text-red-300 ring-1 ring-red-400/20">
            +18.4%
          </span>
        </div>
      </div>
    </div>
  );
}

export default RiskTrendChart;