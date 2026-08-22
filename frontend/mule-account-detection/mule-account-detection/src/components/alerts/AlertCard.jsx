import React from "react";

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

function AlertCard({ alert, onClick }) {
  const style =
    severityStyles[alert?.severity] || severityStyles.MEDIUM;

  return (
    <button
      type="button"
      onClick={() => onClick?.(alert)}
      className="group w-full rounded-xl border border-slate-800 bg-[#0B111B] p-4 text-left transition duration-200 hover:border-slate-700 hover:bg-slate-900/40"
    >
      <div className="flex items-start gap-4">
        {/* Alert Icon */}
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${style.bg} ${style.text}`}
        >
          <span className="text-sm font-bold">!</span>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Top Row */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded border px-2 py-0.5 text-[8px] font-semibold ${style.bg} ${style.border} ${style.text}`}
            >
              {alert?.severity || "MEDIUM"}
            </span>

            {alert?.type && (
              <span className="rounded border border-slate-800 bg-slate-900 px-2 py-0.5 text-[8px] font-medium text-slate-500">
                {alert.type}
              </span>
            )}

            <span className="font-mono text-[8px] text-slate-700">
              {alert?.id || "ALT-00000"}
            </span>
          </div>

          {/* Title */}
          <h3 className="mt-2 text-xs font-semibold text-slate-300 transition group-hover:text-white">
            {alert?.title || "Suspicious Activity Detected"}
          </h3>

          {/* Description */}
          <p className="mt-1 max-w-3xl text-[10px] leading-relaxed text-slate-600">
            {alert?.description ||
              "Suspicious account behaviour has been detected."}
          </p>

          {/* Metadata */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {alert?.account && (
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] text-slate-700">
                  ACCOUNT
                </span>

                <span className="font-mono text-[9px] text-slate-500">
                  {alert.account}
                </span>
              </div>
            )}

            {alert?.amount && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-800">•</span>

                <span className="text-[8px] text-slate-700">
                  AMOUNT
                </span>

                <span className="font-mono text-[9px] text-slate-500">
                  {alert.amount}
                </span>
              </div>
            )}

            {alert?.time && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-800">•</span>

                <span className="text-[9px] text-slate-600">
                  {alert.time}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="hidden shrink-0 flex-col items-end gap-2 sm:flex">
          <span className="text-[8px] uppercase tracking-wider text-slate-700">
            Status
          </span>

          <div className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                alert?.status === "OPEN"
                  ? style.dot
                  : "bg-cyan-400"
              }`}
            />

            <span className="text-[9px] font-medium text-slate-500">
              {alert?.status || "OPEN"}
            </span>
          </div>

          <span className="mt-1 text-slate-700 transition group-hover:translate-x-1 group-hover:text-slate-400">
            →
          </span>
        </div>
      </div>
    </button>
  );
}

export default AlertCard;