import React from "react";

function MuleProbability({
  probability = 92,
  classification = "LIKELY MULE",
  model = "MuleGuard ML v1.0",
}) {
  const safeProbability = Math.min(
    Math.max(Number(probability) || 0, 0),
    100
  );

  const getRiskStyle = () => {
    if (safeProbability >= 80) {
      return {
        color: "text-red-400",
        bg: "bg-red-400/10",
        border: "border-red-400/20",
        bar: "bg-red-400",
        label: "Very High",
      };
    }

    if (safeProbability >= 60) {
      return {
        color: "text-orange-400",
        bg: "bg-orange-400/10",
        border: "border-orange-400/20",
        bar: "bg-orange-400",
        label: "High",
      };
    }

    if (safeProbability >= 40) {
      return {
        color: "text-amber-400",
        bg: "bg-amber-400/10",
        border: "border-amber-400/20",
        bar: "bg-amber-400",
        label: "Moderate",
      };
    }

    return {
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
      border: "border-emerald-400/20",
      bar: "bg-emerald-400",
      label: "Low",
    };
  };

  const style = getRiskStyle();

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0B111B] p-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
            ML Classification
          </p>

          <h2 className="mt-1 text-sm font-semibold text-white">
            Mule Probability
          </h2>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-400">
          ✦
        </div>
      </div>

      {/* Main Probability */}
      <div className="mt-6 flex items-center justify-between gap-5">
        <div>
          <p className={`text-4xl font-bold tracking-tight ${style.color}`}>
            {safeProbability}%
          </p>

          <p className="mt-1 text-[10px] text-slate-600">
            probability of mule behaviour
          </p>
        </div>

        <div
          className={`rounded-lg border px-3 py-2 text-center ${style.bg} ${style.border}`}
        >
          <p className={`text-[10px] font-bold tracking-wider ${style.color}`}>
            {classification}
          </p>

          <p className="mt-1 text-[9px] text-slate-600">
            {style.label} confidence
          </p>
        </div>
      </div>

      {/* Probability Bar */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[9px] uppercase tracking-wider text-slate-600">
            Mule likelihood
          </span>

          <span className={`font-mono text-[10px] ${style.color}`}>
            {safeProbability}/100
          </span>
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
          <div
            className={`h-full rounded-full transition-all duration-700 ${style.bar}`}
            style={{
              width: `${safeProbability}%`,
            }}
          />
        </div>

        <div className="mt-2 flex justify-between text-[8px] text-slate-700">
          <span>LEGITIMATE</span>
          <span>SUSPICIOUS</span>
          <span>MULE</span>
        </div>
      </div>

      {/* Model Details */}
      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-800 pt-4">
        <div>
          <p className="text-[9px] uppercase tracking-wider text-slate-600">
            Model
          </p>

          <p className="mt-1 text-[10px] font-medium text-slate-400">
            {model}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[9px] uppercase tracking-wider text-slate-600">
            Classification
          </p>

          <p className={`mt-1 text-[10px] font-semibold ${style.color}`}>
            {classification}
          </p>
        </div>
      </div>

      {/* Disclaimer / Explanation */}
      <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/30 p-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 text-[10px] text-cyan-400">ⓘ</span>

          <p className="text-[9px] leading-relaxed text-slate-600">
            Probability is generated from behavioural, transactional, and
            network features. It should support investigator review rather
            than act as the sole decision factor.
          </p>
        </div>
      </div>
    </div>
  );
}

export default MuleProbability;