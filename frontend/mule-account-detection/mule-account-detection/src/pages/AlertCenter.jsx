import React, { useMemo, useState } from "react";
import MainLayout from "../components/layout/mainlayout";

const alerts = [
  {
    id: "ALT-10482",
    severity: "CRITICAL",
    title: "Possible Mule Account Detected",
    account: "ACC-10234",
    description:
      "Account shows rapid movement of recently received funds across multiple high-risk counterparties.",
    time: "2 min ago",
    amount: "₹9.3L",
    status: "OPEN",
    type: "MULE",
  },
  {
    id: "ALT-10481",
    severity: "HIGH",
    title: "Unusual Transaction Velocity",
    account: "ACC-78124",
    description:
      "Transaction frequency is significantly above the account's historical behavioural baseline.",
    time: "14 min ago",
    amount: "₹4.8L",
    status: "OPEN",
    type: "VELOCITY",
  },
  {
    id: "ALT-10480",
    severity: "HIGH",
    title: "High-Risk Network Connection",
    account: "ACC-92817",
    description:
      "Account is connected to multiple entities with elevated fraud risk scores.",
    time: "31 min ago",
    amount: "₹4.5L",
    status: "INVESTIGATING",
    type: "NETWORK",
  },
  {
    id: "ALT-10479",
    severity: "MEDIUM",
    title: "New Counterparty Pattern",
    account: "ACC-44291",
    description:
      "Multiple transactions were initiated with previously unseen counterparties.",
    time: "52 min ago",
    amount: "₹2.25L",
    status: "OPEN",
    type: "COUNTERPARTY",
  },
  {
    id: "ALT-10478",
    severity: "MEDIUM",
    title: "Amount Deviation Detected",
    account: "ACC-67102",
    description:
      "Transaction amounts differ significantly from the account's normal activity.",
    time: "1 hr ago",
    amount: "₹2.1L",
    status: "REVIEWED",
    type: "ANOMALY",
  },
];

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
  }, [severityFilter, statusFilter]);

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
      subtitle="Monitor and investigate AI-generated fraud and mule-account alerts"
      onNavigate={onNavigate}
    >
      {/* Page Header */}
      <div className="border-b border-slate-800 bg-[#0B111B]">
        <div className="mx-auto max-w-[1500px] px-5 py-5 lg:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.6)]" />

                <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-red-400">
                  Security Operations
                </span>
              </div>

              <h1 className="mt-2 text-xl font-semibold tracking-tight text-white">
                Alert Center
              </h1>

              <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-slate-600">
                Monitor and investigate AI-generated fraud and mule-account
                alerts.
              </p>
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
      <main className="mx-auto max-w-[1500px] p-5 lg:p-7">
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
                        {alert.amount}
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
                No alerts found
              </p>

              <p className="mt-1 text-[9px] text-slate-600">
                Try changing your filters.
              </p>
            </div>
          )}
        </div>
      </main>

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
                  {selectedAlert.amount}
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