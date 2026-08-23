import React, { useCallback, useEffect, useMemo, useState } from "react";
import MainLayout from "../components/layout/mainlayout";
import { getAlerts, updateAlertStatus } from "../services/api";


// Backend alert_type -> the human title this screen already renders.
const ALERT_TITLES = {
  mule_account: "Possible Mule Account Detected",
  anomalous_transaction: "Anomalous Transaction",
  structuring: "Possible Structuring / Split Transfers",
  rapid_movement: "Rapid Movement of Funds",
  network_pattern: "High-Risk Network Connection",
};

const relativeTime = (iso) => {
  if (!iso) return "unknown";

  const then = new Date(iso).getTime();

  if (Number.isNaN(then)) return "unknown";

  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;

  return `${Math.floor(seconds / 86400)}d ago`;
};

/**
 * Map an API alert onto the shape this screen was written against, so the
 * existing layout keeps working while the data becomes real.
 */
const adaptAlert = (alert) => ({
  id: `ALT-${alert.alert_id}`,
  alertId: alert.alert_id,
  severity: String(alert.severity || "low").toUpperCase(),
  title: ALERT_TITLES[alert.alert_type] || "Fraud Alert",
  account: `Account #${alert.account_id}`,
  accountId: alert.account_id,
  description: alert.reason || "No explanation was recorded for this alert.",
  time: relativeTime(alert.created_at),
  reference:
    alert.transaction_id != null ? `Txn #${alert.transaction_id}` : "Account-level",
  status: String(alert.status || "open").toUpperCase(),
  type: String(alert.alert_type || "").toUpperCase(),
});


const severityStyles = {
  CRITICAL: {
    text: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/20",
    dot: "bg-red-400",
  },
  HIGH: {
    text: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/20",
    dot: "bg-orange-400",
  },
  MEDIUM: {
    text: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
    dot: "bg-amber-400",
  },
  LOW: {
    text: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
    dot: "bg-emerald-400",
  },
};

function AlertCenter({ onNavigate }) {
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedAlert, setSelectedAlert] = useState(null);

  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getAlerts();

      setAlerts(Array.isArray(data) ? data.map(adaptAlert) : []);
    } catch (err) {
      console.error("Alert loading error:", err);
      setError(err.message || "Unable to load alerts.");
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleStatusChange = useCallback(
    async (alert, nextStatus) => {
      setUpdatingId(alert.alertId);

      try {
        await updateAlertStatus(alert.alertId, nextStatus);
        await loadAlerts();
        setSelectedAlert(null);
      } catch (err) {
        console.error("Alert status update failed:", err);
        setError(err.message || "Unable to update the alert.");
      } finally {
        setUpdatingId(null);
      }
    },
    [loadAlerts]
  );

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const severityMatch =
        severityFilter === "ALL" ||
        alert.severity === severityFilter;

      const statusMatch =
        statusFilter === "ALL" ||
        alert.status === statusFilter;

      return severityMatch && statusMatch;
    });
  }, [alerts, severityFilter, statusFilter]);

  const criticalCount = alerts.filter(
    (alert) => alert.severity === "CRITICAL"
  ).length;

  const highCount = alerts.filter(
    (alert) => alert.severity === "HIGH"
  ).length;

  const openCount = alerts.filter(
    (alert) => alert.status === "OPEN"
  ).length;

  return (
    <MainLayout
      activePage="Alert Center"
      title="Alert Center"
      subtitle="Monitor and investigate fraud and mule-account alerts raised by the detection engine"
      onNavigate={onNavigate}
    >
      <div className="space-y-6">
        {/* Toolbar */}
        <div className="rounded-2xl border border-slate-800 bg-[#0B111B]">
        <div className="mx-auto max-w-[1500px] px-5 py-3 lg:px-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.6)]" />

                <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-red-400">
                  Security Operations
                </span>
              </div>

            </div>

            <button
              type="button"
              className="w-fit rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-[9px] font-medium text-cyan-400 transition hover:bg-cyan-400/10"
            >
              Export Alerts
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-[#0B111B] p-4">
            <p className="text-[9px] uppercase tracking-wider text-slate-600">
              Total Alerts
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-200">
              {alerts.length}
            </p>
          </div>

          <div className="rounded-xl border border-red-400/10 bg-[#0B111B] p-4">
            <p className="text-[9px] uppercase tracking-wider text-slate-600">
              Critical
            </p>

            <p className="mt-2 text-2xl font-bold text-red-400">
              {criticalCount}
            </p>
          </div>

          <div className="rounded-xl border border-orange-400/10 bg-[#0B111B] p-4">
            <p className="text-[9px] uppercase tracking-wider text-slate-600">
              High Risk
            </p>

            <p className="mt-2 text-2xl font-bold text-orange-400">
              {highCount}
            </p>
          </div>

          <div className="rounded-xl border border-cyan-400/10 bg-[#0B111B] p-4">
            <p className="text-[9px] uppercase tracking-wider text-slate-600">
              Open
            </p>

            <p className="mt-2 text-2xl font-bold text-cyan-400">
              {openCount}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-slate-800 bg-[#0B111B] p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">
              Alert Filters
            </p>

            <p className="mt-1 text-[10px] text-slate-500">
              Showing {filteredAlerts.length} of {alerts.length} alerts
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-[9px] text-slate-400 outline-none focus:border-cyan-400/30"
            >
              <option value="ALL">All Severity</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-[9px] text-slate-400 outline-none focus:border-cyan-400/30"
            >
              <option value="ALL">All Status</option>
              <option value="OPEN">Open</option>
              <option value="INVESTIGATING">Investigating</option>
              <option value="REVIEWED">Reviewed</option>
            </select>
          </div>
        </div>

        {/* Alert List */}
        <div className="mt-4 space-y-3">
          {filteredAlerts.map((alert) => {
            const style =
              severityStyles[alert.severity] ||
              severityStyles.MEDIUM;

            return (
              <button
                key={alert.id}
                type="button"
                onClick={() => setSelectedAlert(alert)}
                className="w-full rounded-xl border border-slate-800 bg-[#0B111B] p-4 text-left transition hover:border-slate-700 hover:bg-slate-900/40"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  {/* Severity */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${style.bg} ${style.text}`}
                  >
                    <span className="text-sm font-bold">!</span>
                  </div>

                  {/* Main */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded border px-2 py-0.5 text-[8px] font-semibold ${style.bg} ${style.border} ${style.text}`}
                      >
                        {alert.severity}
                      </span>

                      <span className="font-mono text-[8px] text-slate-700">
                        {alert.id}
                      </span>
                    </div>

                    <h2 className="mt-2 text-xs font-semibold text-slate-300">
                      {alert.title}
                    </h2>

                    <p className="mt-1 max-w-3xl text-[10px] leading-relaxed text-slate-600">
                      {alert.description}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <span className="font-mono text-[9px] text-slate-500">
                        {alert.account}
                      </span>

                      <span className="text-[9px] text-slate-700">
                        •
                      </span>

                      <span className="font-mono text-[9px] text-slate-500">
                        {alert.reference}
                      </span>

                      <span className="text-[9px] text-slate-700">
                        •
                      </span>

                      <span className="text-[9px] text-slate-600">
                        {alert.time}
                      </span>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex shrink-0 items-center gap-3 lg:flex-col lg:items-end">
                    <span className="text-[9px] text-slate-600">
                      STATUS
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          alert.status === "OPEN"
                            ? style.dot
                            : "bg-cyan-400"
                        }`}
                      />

                      <span className="text-[9px] font-medium text-slate-400">
                        {alert.status}
                      </span>
                    </div>
                  </div>

                  <span className="text-slate-700">→</span>
                </div>
              </button>
            );
          })}

          {filteredAlerts.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-800 bg-[#0B111B] p-10 text-center">
              <p className="text-xs font-medium text-slate-400">
                {loading
                  ? "Loading alerts..."
                  : error
                  ? `Unable to load alerts: ${error}`
                  : "No alerts found"}
              </p>

              <p className="mt-1 text-[9px] text-slate-600">
                Try changing your filters.
              </p>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm"
          onClick={() => setSelectedAlert(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-slate-800 bg-[#0B111B] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-[9px] text-slate-600">
                  {selectedAlert.id}
                </p>

                <h2 className="mt-1 text-sm font-semibold text-white">
                  {selectedAlert.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAlert(null)}
                className="text-lg leading-none text-slate-600 transition hover:text-white"
                aria-label="Close alert details"
              >
                ×
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-slate-900/50 p-3">
                <p className="text-[8px] uppercase text-slate-600">
                  Account
                </p>

                <p className="mt-1 font-mono text-[10px] text-slate-300">
                  {selectedAlert.account}
                </p>
              </div>

              <div className="rounded-lg bg-slate-900/50 p-3">
                <p className="text-[8px] uppercase text-slate-600">
                  Amount
                </p>

                <p className="mt-1 font-mono text-[10px] text-slate-300">
                  {selectedAlert.reference}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-slate-900/50 p-3">
                <p className="text-[8px] uppercase text-slate-600">
                  Severity
                </p>

                <p
                  className={`mt-1 text-[10px] font-semibold ${
                    severityStyles[selectedAlert.severity]?.text ||
                    "text-slate-300"
                  }`}
                >
                  {selectedAlert.severity}
                </p>
              </div>

              <div className="rounded-lg bg-slate-900/50 p-3">
                <p className="text-[8px] uppercase text-slate-600">
                  Status
                </p>

                <p className="mt-1 text-[10px] font-semibold text-slate-300">
                  {selectedAlert.status}
                </p>
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-slate-800 p-3">
              <p className="text-[9px] uppercase tracking-wider text-slate-600">
                Detection Reason
              </p>

              <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
                {selectedAlert.description}
              </p>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedAlert(null)}
                className="rounded-md border border-slate-800 px-3 py-2 text-[9px] text-slate-500 transition hover:text-slate-300"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onNavigate) {
                    onNavigate("Network Intelligence");
                  }
                  setSelectedAlert(null);
                }}
                className="rounded-md border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-[9px] text-cyan-400 transition hover:bg-cyan-400/10"
              >
                Investigate Account
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

export default AlertCenter;