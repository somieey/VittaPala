import React from "react";

function RiskScore({
  score = 94,
  riskLevel = "CRITICAL",
  confidence = 91,
}) {
  const getRiskConfig = () => {
    if (score >= 80) {
      return {
        label: "CRITICAL",
        color: "text-red-400",
        bg: "bg-red-400/10",
        border: "border-red-400/20",
        bar: "bg-red-400",
        glow: "shadow-[0_0_18px_rgba(248,113,113,0.25)]",
      };
    }

    if (score >= 60) {
      return {
        label: "HIGH",
        color: "text-orange-400",
        bg: "bg-orange-400/10",
        border: "border-orange-400/20",
        bar: "bg-orange-400",
        glow: "shadow-[0_0_18px_rgba(251,146,60,0.2)]",
      };
    }

    if (score >= 40) {
      return {
        label: "MEDIUM",
        color: "text-amber-400",
        bg: "bg-amber-400/10",
        border: "border-amber-400/20",
        bar: "bg-amber-400",
        glow: "",
      };
    }

    return {
      label: "LOW",
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
      border: "border-emerald-400/20",
      bar: "bg-emerald-400",
      glow: "",
    };
  };

  const risk = getRiskConfig();

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0B111B] p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
            AI Risk Assessment
          </p>

          <h2 className="mt-1 text-sm font-semibold text-white">
            Account Risk Score
          </h2>
        </div>

        <div
          className={`rounded-md border px-2.5 py-1 text-[10px] font-bold tracking-wider ${risk.bg} ${risk.border} ${risk.color}`}
        >
          {riskLevel || risk.label}
        </div>
      </div>

      {/* Score */}
      <div className="mt-6 flex items-center gap-6">
        {/* Circular Score */}
        <div
          className={`relative flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-[8px] border-slate-800 ${risk.glow}`}
        >
          <div className="text-center">
            <p className={`text-3xl font-bold tracking-tight ${risk.color}`}>
              {score}
            </p>

            <p className="text-[9px] uppercase tracking-wider text-slate-600">
              / 100
            </p>
          </div>
        </div>

        {/* Assessment */}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-slate-300">
            Suspicion Level
          </p>

          <p className={`mt-1 text-lg font-semibold ${risk.color}`}>
            {risk.label}
          </p>

          <p className="mt-2 text-[10px] leading-relaxed text-slate-600">
            Based on transaction behaviour, account activity, anomaly signals,
            and connected account risk.
          </p>
        </div>
      </div>

      {/* Risk Meter */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] text-slate-600">
            Risk intensity
          </span>

          <span className="font-mono text-[10px] text-slate-500">
            {score}%
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-700 ${risk.bar}`}
            style={{
              width: `${Math.min(Math.max(score, 0), 100)}%`,
            }}
          />
        </div>

        <div className="mt-2 flex justify-between text-[9px] text-slate-700">
          <span>LOW</span>
          <span>MEDIUM</span>
          <span>HIGH</span>
          <span>CRITICAL</span>
        </div>
      </div>

      {/* Confidence */}
      <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-4">
        <div>
          <p className="text-[10px] text-slate-600">
            Model confidence
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-300">
            {confidence}%
          </p>
        </div>

        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-cyan-400"
            style={{
              width: `${Math.min(Math.max(confidence, 0), 100)}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default RiskScore;