import React from "react";

function AlertFilters({
  severity = "ALL",
  status = "ALL",
  type = "ALL",
  onSeverityChange,
  onStatusChange,
  onTypeChange,
  onReset,
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#0B111B] p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        {/* Filter Heading */}
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-600">
            Alert Filters
          </p>

          <p className="mt-1 text-[10px] text-slate-700">
            Narrow alerts by severity, status, and detection type.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-2">
          {/* Severity */}
          <div>
            <label className="mb-1 block text-[8px] uppercase tracking-wider text-slate-700">
              Severity
            </label>

            <select
              value={severity}
              onChange={(e) =>
                onSeverityChange?.(e.target.value)
              }
              className="min-w-[125px] rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-[9px] text-slate-400 outline-none transition focus:border-cyan-400/30"
            >
              <option value="ALL">All Severity</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="mb-1 block text-[8px] uppercase tracking-wider text-slate-700">
              Status
            </label>

            <select
              value={status}
              onChange={(e) =>
                onStatusChange?.(e.target.value)
              }
              className="min-w-[125px] rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-[9px] text-slate-400 outline-none transition focus:border-cyan-400/30"
            >
              <option value="ALL">All Status</option>
              <option value="OPEN">Open</option>
              <option value="INVESTIGATING">
                Investigating
              </option>
              <option value="REVIEWED">Reviewed</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="mb-1 block text-[8px] uppercase tracking-wider text-slate-700">
              Detection Type
            </label>

            <select
              value={type}
              onChange={(e) =>
                onTypeChange?.(e.target.value)
              }
              className="min-w-[145px] rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-[9px] text-slate-400 outline-none transition focus:border-cyan-400/30"
            >
              <option value="ALL">All Types</option>
              <option value="MULE">Mule Detection</option>
              <option value="VELOCITY">
                Transaction Velocity
              </option>
              <option value="NETWORK">
                Network Risk
              </option>
              <option value="COUNTERPARTY">
                Counterparty
              </option>
              <option value="ANOMALY">
                Behavioural Anomaly
              </option>
            </select>
          </div>

          {/* Reset */}
          <button
            type="button"
            onClick={onReset}
            className="rounded-md border border-slate-800 px-3 py-2 text-[9px] font-medium text-slate-600 transition hover:border-slate-700 hover:text-slate-300"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Active Filter Indicators */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-3">
        <span className="text-[8px] uppercase tracking-wider text-slate-700">
          Active:
        </span>

        {severity !== "ALL" && (
          <span className="rounded-md border border-red-400/10 bg-red-400/5 px-2 py-1 text-[8px] text-red-400">
            Severity: {severity}
          </span>
        )}

        {status !== "ALL" && (
          <span className="rounded-md border border-cyan-400/10 bg-cyan-400/5 px-2 py-1 text-[8px] text-cyan-400">
            Status: {status}
          </span>
        )}

        {type !== "ALL" && (
          <span className="rounded-md border border-purple-400/10 bg-purple-400/5 px-2 py-1 text-[8px] text-purple-400">
            Type: {type}
          </span>
        )}

        {severity === "ALL" &&
          status === "ALL" &&
          type === "ALL" && (
            <span className="text-[8px] text-slate-700">
              No filters applied
            </span>
          )}
      </div>
    </div>
  );
}

export default AlertFilters;