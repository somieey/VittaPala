import React from "react";
import AlertCard from "./AlertCard";

function AlertList({
  alerts = [],
  onAlertClick,
  emptyMessage = "No alerts found",
}) {
  return (
    <div className="space-y-3">
      {/* List Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">
            Security Alerts
          </p>

          <p className="mt-1 text-[9px] text-slate-700">
            {alerts.length} alert{alerts.length !== 1 ? "s" : ""} detected
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400" />

          <span className="text-[8px] text-slate-600">
            Live monitoring
          </span>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 ? (
        alerts.map((alert) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            onClick={onAlertClick}
          />
        ))
      ) : (
        <div className="rounded-xl border border-dashed border-slate-800 bg-[#0B111B] p-10 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-400">
            ✓
          </div>

          <p className="mt-3 text-xs font-medium text-slate-400">
            {emptyMessage}
          </p>

          <p className="mt-1 text-[9px] text-slate-700">
            No matching suspicious activity is currently available.
          </p>
        </div>
      )}
    </div>
  );
}

export default AlertList;