import React from "react";

function NetworkControls({
  riskFilter = "ALL",
  depth = 2,
  viewMode = "FLOW",
  onRiskFilterChange,
  onDepthChange,
  onViewModeChange,
}) {
  const riskOptions = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"];
  const depthOptions = [1, 2, 3];
  const viewOptions = ["FLOW", "RISK", "CLUSTERS"];

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0B111B] p-4">
      {/* Header */}
      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
          Network Controls
        </p>

        <h2 className="mt-1 text-sm font-semibold text-white">
          Investigation Filters
        </h2>
      </div>

      {/* Risk Filter */}
      <div>
        <label className="mb-2 block text-[9px] font-semibold uppercase tracking-wider text-slate-600">
          Risk Level
        </label>

        <div className="flex flex-wrap gap-1.5">
          {riskOptions.map((option) => {
            const active = riskFilter === option;

            return (
              <button
                key={option}
                type="button"
                onClick={() => onRiskFilterChange?.(option)}
                className={`rounded-md border px-2.5 py-1.5 text-[9px] font-medium transition ${
                  active
                    ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-400"
                    : "border-slate-800 bg-slate-900/40 text-slate-500 hover:border-slate-700 hover:text-slate-300"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      {/* Relationship Depth */}
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <label className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">
            Relationship Depth
          </label>

          <span className="font-mono text-[10px] text-cyan-400">
            {depth} hop{depth > 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex gap-1.5">
          {depthOptions.map((option) => {
            const active = depth === option;

            return (
              <button
                key={option}
                type="button"
                onClick={() => onDepthChange?.(option)}
                className={`flex-1 rounded-md border py-2 text-[9px] font-semibold transition ${
                  active
                    ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-400"
                    : "border-slate-800 bg-slate-900/40 text-slate-500 hover:border-slate-700"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>

        <p className="mt-2 text-[9px] leading-relaxed text-slate-600">
          Controls how many connected account layers are displayed from the
          selected account.
        </p>
      </div>

      {/* View Mode */}
      <div className="mt-5">
        <label className="mb-2 block text-[9px] font-semibold uppercase tracking-wider text-slate-600">
          Visualization
        </label>

        <div className="grid grid-cols-3 gap-1.5">
          {viewOptions.map((option) => {
            const active = viewMode === option;

            return (
              <button
                key={option}
                type="button"
                onClick={() => onViewModeChange?.(option)}
                className={`rounded-md border px-2 py-2 text-[8px] font-semibold transition ${
                  active
                    ? "border-purple-400/30 bg-purple-400/10 text-purple-400"
                    : "border-slate-800 bg-slate-900/40 text-slate-500 hover:border-slate-700 hover:text-slate-300"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      {/* Network Statistics */}
      <div className="mt-5 border-t border-slate-800 pt-4">
        <p className="mb-3 text-[9px] font-semibold uppercase tracking-wider text-slate-600">
          Network Statistics
        </p>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-slate-900/50 p-3">
            <p className="text-[9px] text-slate-600">
              Nodes
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-300">
              6
            </p>
          </div>

          <div className="rounded-lg bg-slate-900/50 p-3">
            <p className="text-[9px] text-slate-600">
              Connections
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-300">
              5
            </p>
          </div>

          <div className="rounded-lg bg-red-400/5 p-3">
            <p className="text-[9px] text-slate-600">
              High Risk
            </p>

            <p className="mt-1 text-sm font-semibold text-red-400">
              3
            </p>
          </div>

          <div className="rounded-lg bg-cyan-400/5 p-3">
            <p className="text-[9px] text-slate-600">
              Flow Volume
            </p>

            <p className="mt-1 text-sm font-semibold text-cyan-400">
              ₹15.2L
            </p>
          </div>
        </div>
      </div>

      {/* Security Note */}
      <div className="mt-4 rounded-lg border border-cyan-400/10 bg-cyan-400/[0.03] p-3">
        <div className="flex gap-2">
          <span className="text-[10px] text-cyan-400">
            ◈
          </span>

          <p className="text-[9px] leading-relaxed text-slate-600">
            Network analysis helps identify possible mule chains,
            pass-through accounts, and high-risk connected entities.
          </p>
        </div>
      </div>
    </div>
  );
}

export default NetworkControls;