import React from "react";

const colorStyles = {
  blue: {
    icon: "bg-cyan-400/10 text-cyan-300 ring-cyan-400/20",
    glow: "group-hover:shadow-cyan-500/10",
    value: "text-cyan-300",
  },
  red: {
    icon: "bg-red-400/10 text-red-300 ring-red-400/20",
    glow: "group-hover:shadow-red-500/10",
    value: "text-red-300",
  },
  orange: {
    icon: "bg-amber-400/10 text-amber-300 ring-amber-400/20",
    glow: "group-hover:shadow-amber-500/10",
    value: "text-amber-300",
  },
  purple: {
    icon: "bg-violet-400/10 text-violet-300 ring-violet-400/20",
    glow: "group-hover:shadow-violet-500/10",
    value: "text-violet-300",
  },
};

function StatCard({
  title,
  value,
  icon,
  color = "blue",
  change,
  changeType = "neutral",
}) {
  const styles = colorStyles[color] || colorStyles.blue;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-slate-800 bg-[#0B111B] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-700 hover:shadow-xl ${styles.glow}`}
    >
      {/* Background glow */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-cyan-500/5 blur-3xl transition-opacity duration-300 group-hover:opacity-100" />

      {/* Header */}
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
            {title}
          </p>

          <p className={`mt-3 text-3xl font-bold tracking-tight ${styles.value}`}>
            {value}
          </p>
        </div>

        {/* Icon */}
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg ring-1 ${styles.icon}`}
        >
          {icon}
        </div>
      </div>

      {/* Bottom information */}
      <div className="relative mt-5 flex items-center justify-between border-t border-slate-800/80 pt-4">
        {change ? (
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-semibold ${
                changeType === "positive"
                  ? "text-emerald-400"
                  : changeType === "negative"
                  ? "text-red-400"
                  : "text-slate-400"
              }`}
            >
              {change}
            </span>

            <span className="text-[11px] text-slate-600">
              vs last period
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-slate-600">
            Updated just now
          </span>
        )}

        <span className="text-[10px] uppercase tracking-wider text-slate-600">
          Live
        </span>
      </div>
    </div>
  );
}

export default StatCard;