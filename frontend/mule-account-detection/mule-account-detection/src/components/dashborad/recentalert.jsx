import React from "react";

const alerts = [
  {
    id: "ALT-1042",
    account: "ACC-7821",
    type: "Mule Network",
    description: "Connected to 4 high-risk accounts",
    risk: 94,
    level: "Critical",
    time: "2 min ago",
  },
  {
    id: "ALT-1041",
    account: "ACC-4518",
    type: "Rapid Fund Movement",
    description: "Multiple transfers within 8 minutes",
    risk: 87,
    level: "High",
    time: "7 min ago",
  },
  {
    id: "ALT-1040",
    account: "ACC-9234",
    type: "Layering Pattern",
    description: "Funds moved across 5 accounts",
    risk: 82,
    level: "High",
    time: "14 min ago",
  },
  {
    id: "ALT-1039",
    account: "ACC-3167",
    type: "Behaviour Anomaly",
    description: "Transaction volume increased by 540%",
    risk: 71,
    level: "Medium",
    time: "21 min ago",
  },
];

const levelStyles = {
  Critical: {
    badge: "bg-red-400/10 text-red-300 ring-red-400/20",
    dot: "bg-red-400",
    score: "text-red-300",
  },
  High: {
    badge: "bg-amber-400/10 text-amber-300 ring-amber-400/20",
    dot: "bg-amber-400",
    score: "text-amber-300",
  },
  Medium: {
    badge: "bg-yellow-400/10 text-yellow-300 ring-yellow-400/20",
    dot: "bg-yellow-400",
    score: "text-yellow-300",
  },
};

function RecentAlerts() {
  return (
    <section className="rounded-2xl border border-slate-800 bg-[#0B111B]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-white">
            Recent Security Alerts
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Latest suspicious activity requiring investigation
          </p>
        </div>

        <button
          type="button"
          className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs font-medium text-slate-400 transition hover:border-slate-700 hover:text-white"
        >
          View All Alerts →
        </button>
      </div>

      {/* Alerts */}
      <div className="divide-y divide-slate-800/80">
        {alerts.map((alert) => {
          const styles =
            levelStyles[alert.level] || levelStyles.Medium;

          return (
            <div
              key={alert.id}
              className="group flex flex-col gap-4 px-5 py-4 transition hover:bg-slate-900/40 lg:flex-row lg:items-center lg:justify-between"
            >
              {/* Left */}
              <div className="flex min-w-0 items-center gap-4">
                {/* Risk indicator */}
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/70">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${styles.dot}`}
                  />

                  {alert.level === "Critical" && (
                    <span
                      className={`absolute h-2.5 w-2.5 animate-ping rounded-full opacity-40 ${styles.dot}`}
                    />
                  )}
                </div>

                {/* Alert details */}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-white">
                      {alert.account}
                    </span>

                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ${styles.badge}`}
                    >
                      {alert.level}
                    </span>
                  </div>

                  <p className="mt-1 text-xs font-medium text-slate-400">
                    {alert.type}
                  </p>

                  <p className="mt-1 truncate text-[11px] text-slate-600">
                    {alert.description}
                  </p>
                </div>
              </div>

              {/* Right */}
              <div className="flex items-center justify-between gap-6 lg:justify-end">
                {/* Risk score */}
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-600">
                    Risk Score
                  </p>

                  <p
                    className={`mt-1 text-lg font-bold ${styles.score}`}
                  >
                    {alert.risk}
                    <span className="text-xs font-normal text-slate-600">
                      /100
                    </span>
                  </p>
                </div>

                {/* Time */}
                <div className="hidden w-20 text-right sm:block">
                  <p className="text-[11px] text-slate-500">
                    {alert.time}
                  </p>

                  <p className="mt-1 text-[10px] text-slate-700">
                    {alert.id}
                  </p>
                </div>

                {/* Investigate */}
                <button
                  type="button"
                  className="rounded-lg border border-slate-800 px-3 py-2 text-xs font-medium text-slate-400 opacity-70 transition group-hover:border-cyan-400/20 group-hover:text-cyan-300 group-hover:opacity-100"
                >
                  Investigate
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-800 px-5 py-3">
        <p className="text-[11px] text-slate-600">
          Showing latest 4 alerts
        </p>

        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

          <span className="text-[11px] text-slate-500">
            Monitoring active
          </span>
        </div>
      </div>
    </section>
  );
}

export default RecentAlerts;