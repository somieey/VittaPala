import React from "react";

const defaultIndicators = [
  {
    label: "Rapid Fund Movement",
    value: 92,
    status: "HIGH",
    description: "Funds leave the account shortly after receipt.",
  },
  {
    label: "Transaction Velocity",
    value: 87,
    status: "HIGH",
    description: "Unusually high number of transactions in short periods.",
  },
  {
    label: "New Counterparties",
    value: 81,
    status: "HIGH",
    description: "Frequent interaction with previously unseen accounts.",
  },
  {
    label: "Amount Deviation",
    value: 74,
    status: "MEDIUM",
    description: "Transaction amounts differ significantly from baseline.",
  },
  {
    label: "Network Exposure",
    value: 89,
    status: "HIGH",
    description: "Strong connections with other risky accounts.",
  },
];

function getStatus(value) {
  if (value >= 80) {
    return {
      label: "HIGH",
      text: "text-red-400",
      bg: "bg-red-400/10",
      bar: "bg-red-400",
    };
  }

  if (value >= 50) {
    return {
      label: "MEDIUM",
      text: "text-amber-400",
      bg: "bg-amber-400/10",
      bar: "bg-amber-400",
    };
  }

  return {
    label: "LOW",
    text: "text-emerald-400",
    bg: "bg-emerald-400/10",
    bar: "bg-emerald-400",
  };
}

function FraudDNA({ indicators = defaultIndicators }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#0B111B] p-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-400/10 text-purple-400">
              ◈
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                Behavioural Intelligence
              </p>

              <h2 className="mt-1 text-sm font-semibold text-white">
                Fraud DNA
              </h2>
            </div>
          </div>
        </div>

        <span className="rounded-md border border-purple-400/20 bg-purple-400/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-purple-400">
          AI Pattern
        </span>
      </div>

      {/* Description */}
      <p className="mt-4 text-[10px] leading-relaxed text-slate-500">
        Behavioural indicators contributing to this account's suspicious
        activity profile.
      </p>

      {/* Indicators */}
      <div className="mt-5 space-y-4">
        {indicators.map((indicator) => {
          const status = getStatus(indicator.value);

          return (
            <div key={indicator.label}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-300">
                    {indicator.label}
                  </p>

                  <p className="mt-0.5 text-[9px] text-slate-600">
                    {indicator.description}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[8px] font-semibold ${status.bg} ${status.text}`}
                  >
                    {indicator.status || status.label}
                  </span>

                  <span className="w-7 text-right font-mono text-[10px] text-slate-400">
                    {indicator.value}
                  </span>
                </div>
              </div>

              {/* Indicator bar */}
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${status.bar}`}
                  style={{
                    width: `${Math.min(Math.max(indicator.value, 0), 100)}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-4">
        <div>
          <p className="text-[9px] uppercase tracking-wider text-slate-600">
            Pattern Strength
          </p>

          <p className="mt-1 text-xs font-semibold text-purple-400">
            Strong Match
          </p>
        </div>

        <div className="text-right">
          <p className="text-[9px] uppercase tracking-wider text-slate-600">
            Indicators
          </p>

          <p className="mt-1 font-mono text-xs font-semibold text-slate-300">
            {indicators.length}
          </p>
        </div>
      </div>
    </div>
  );
}

export default FraudDNA;