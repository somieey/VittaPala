import React from "react";

const defaultEvents = [
  {
    time: "14:32",
    date: "22 Aug 2026",
    title: "High-value credit received",
    description: "₹4,80,000 received from ACC-78124.",
    type: "CREDIT",
    risk: "HIGH",
  },
  {
    time: "14:27",
    date: "22 Aug 2026",
    title: "Rapid fund transfer",
    description: "₹4,50,000 transferred to ACC-92817 within 5 minutes.",
    type: "TRANSFER",
    risk: "HIGH",
  },
  {
    time: "13:51",
    date: "22 Aug 2026",
    title: "New counterparty detected",
    description: "Transaction initiated with previously unseen account.",
    type: "NETWORK",
    risk: "MEDIUM",
  },
  {
    time: "10:42",
    date: "22 Aug 2026",
    title: "Account activity increased",
    description: "Transaction velocity crossed the normal behavioural baseline.",
    type: "ANOMALY",
    risk: "MEDIUM",
  },
  {
    time: "08:15",
    date: "22 Aug 2026",
    title: "Risk score updated",
    description: "ML engine increased account risk score to 94/100.",
    type: "AI",
    risk: "CRITICAL",
  },
];

const typeStyles = {
  CREDIT: {
    icon: "↓",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
  },
  TRANSFER: {
    icon: "↗",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/20",
  },
  NETWORK: {
    icon: "◉",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-400/20",
  },
  ANOMALY: {
    icon: "⚠",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
  },
  AI: {
    icon: "✦",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
    border: "border-cyan-400/20",
  },
};

function AccountTimeline({ events = defaultEvents }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#0B111B] p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
            Activity History
          </p>

          <h2 className="mt-1 text-sm font-semibold text-white">
            Account Timeline
          </h2>
        </div>

        <span className="rounded-md border border-slate-800 bg-slate-900/50 px-2 py-1 text-[9px] text-slate-500">
          {events.length} Events
        </span>
      </div>

      {/* Timeline */}
      <div className="mt-6">
        {events.map((event, index) => {
          const style = typeStyles[event.type] || typeStyles.AI;

          return (
            <div
              key={`${event.time}-${event.title}-${index}`}
              className="relative flex gap-4 pb-6 last:pb-0"
            >
              {/* Timeline line */}
              {index !== events.length - 1 && (
                <div className="absolute left-[15px] top-8 h-[calc(100%-8px)] w-px bg-slate-800" />
              )}

              {/* Event icon */}
              <div
                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${style.bg} ${style.border} ${style.color}`}
              >
                <span className="text-xs">{style.icon}</span>
              </div>

              {/* Event content */}
              <div className="min-w-0 flex-1 rounded-lg border border-slate-800/70 bg-slate-900/20 p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-medium text-slate-300">
                      {event.title}
                    </h3>

                    <p className="mt-1 text-[9px] text-slate-600">
                      {event.date} • {event.time}
                    </p>
                  </div>

                  <span
                    className={`rounded-md px-2 py-1 text-[8px] font-semibold ${style.bg} ${style.color}`}
                  >
                    {event.risk}
                  </span>
                </div>

                <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                  {event.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AccountTimeline;