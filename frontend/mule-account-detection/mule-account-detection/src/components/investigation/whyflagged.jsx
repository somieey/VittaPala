import React from "react";

const defaultReasons = [
  {
    severity: "CRITICAL",
    title: "Rapid Fund Movement",
    description:
      "86% of received funds were transferred to other accounts within 20 minutes.",
    evidence: "86% transferred < 20 min",
  },
  {
    severity: "HIGH",
    title: "Unusual Transaction Velocity",
    description:
      "Transaction frequency increased significantly compared with the account's normal behaviour.",
    evidence: "5.4× baseline activity",
  },
  {
    severity: "HIGH",
    title: "Suspicious Network Connection",
    description:
      "The account is connected to multiple accounts with elevated risk scores.",
    evidence: "3 high-risk connections",
  },
  {
    severity: "MEDIUM",
    title: "New Counterparty Activity",
    description:
      "A large number of previously unseen accounts were involved in recent transactions.",
    evidence: "18 new counterparties",
  },
];

const severityStyles = {
  CRITICAL: {
    dot: "bg-red-400",
    icon: "text-red-400",
    badge: "bg-red-400/10 text-red-400 border-red-400/20",
  },
  HIGH: {
    dot: "bg-orange-400",
    icon: "text-orange-400",
    badge: "bg-orange-400/10 text-orange-400 border-orange-400/20",
  },
  MEDIUM: {
    dot: "bg-amber-400",
    icon: "text-amber-400",
    badge: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  },
  LOW: {
    dot: "bg-emerald-400",
    icon: "text-emerald-400",
    badge: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  },
};

function WhyFlagged({ reasons = defaultReasons }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#0B111B] p-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
            Explainable Detection
          </p>

          <h2 className="mt-1 text-sm font-semibold text-white">
            Why This Account Was Flagged
          </h2>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-400/10 text-red-400">
          !
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 rounded-lg border border-red-400/10 bg-red-400/[0.03] p-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-400/10 text-xs font-bold text-red-400">
            !
          </div>

          <div>
            <p className="text-xs font-medium text-slate-300">
              Multiple risk signals detected
            </p>

            <p className="mt-1 text-[10px] leading-relaxed text-slate-600">
              The account was flagged because several independent behavioural
              and transaction signals indicate elevated fraud risk.
            </p>
          </div>
        </div>
      </div>

      {/* Reasons */}
      <div className="mt-5 space-y-3">
        {reasons.map((reason, index) => {
          const style =
            severityStyles[reason.severity] || severityStyles.MEDIUM;

          return (
            <div
              key={`${reason.title}-${index}`}
              className="group rounded-lg border border-slate-800/80 bg-slate-900/20 p-3 transition hover:border-slate-700 hover:bg-slate-900/40"
            >
              <div className="flex items-start gap-3">
                {/* Timeline Dot */}
                <div className="relative mt-1.5">
                  <span
                    className={`block h-2 w-2 rounded-full ${style.dot}`}
                  />

                  {index !== reasons.length - 1 && (
                    <span className="absolute left-[3px] top-3 h-[42px] w-px bg-slate-800" />
                  )}
                </div>

                {/* Reason Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-xs font-medium text-slate-300">
                      {reason.title}
                    </h3>

                    <span
                      className={`rounded border px-1.5 py-0.5 text-[8px] font-semibold tracking-wider ${style.badge}`}
                    >
                      {reason.severity}
                    </span>
                  </div>

                  <p className="mt-1 text-[10px] leading-relaxed text-slate-600">
                    {reason.description}
                  </p>

                  {/* Evidence */}
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-2 py-1">
                    <span className={`text-[9px] ${style.icon}`}>
                      ◈
                    </span>

                    <span className="font-mono text-[9px] text-slate-500">
                      Evidence: {reason.evidence}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-4">
        <div>
          <p className="text-[9px] uppercase tracking-wider text-slate-600">
            Detection Signals
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-300">
            {reasons.length} contributing factors
          </p>
        </div>

        <span className="rounded-md border border-cyan-400/20 bg-cyan-400/5 px-2 py-1 text-[9px] font-medium text-cyan-400">
          Explainable AI
        </span>
      </div>
    </div>
  );
}

export default WhyFlagged;