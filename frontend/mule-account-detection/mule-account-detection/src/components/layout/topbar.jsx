import React from "react";

function Topbar({ title = "Command Center", subtitle = "Real-time fraud intelligence and account monitoring" }) {
  return (
    <header className="sticky top-0 z-40 flex h-[76px] items-center justify-between border-b border-slate-800 bg-[#0A0F18]/95 px-6 backdrop-blur-xl">
      
      {/* Page Title */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-white">
          {title}
        </h2>

        <p className="mt-1 text-xs text-slate-500">
          {subtitle}
        </p>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">

        {/* System Status */}
        <div className="hidden items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 sm:flex">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>

          <span className="text-xs font-medium text-slate-400">
            System Online
          </span>
        </div>

        {/* Notification */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white"
        >
          <span className="text-lg">♢</span>

          {/* Notification Badge */}
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.7)]" />
        </button>

        {/* Divider */}
        <div className="hidden h-8 w-px bg-slate-800 sm:block" />

        {/* Investigator Profile */}
        <button
          type="button"
          className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-slate-800/60"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-400/10 text-sm font-semibold text-cyan-300 ring-1 ring-cyan-400/20">
            IN
          </div>

          <div className="hidden text-left md:block">
            <p className="text-xs font-medium text-slate-200">
              Investigator
            </p>

            <p className="text-[10px] text-slate-500">
              Security Analyst
            </p>
          </div>

          <span className="hidden text-xs text-slate-500 md:block">
            ▾
          </span>
        </button>
      </div>
    </header>
  );
}

export default Topbar;