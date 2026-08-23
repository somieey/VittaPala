import React from "react";

const navigationItems = [
  {
    name: "Command Center",
    icon: "⌂",
    page: "Dashboard",
  },
  {
    name: "Account Investigation",
    icon: "⌕",
    page: "Account Investigation",
  },
  {
    name: "Network Intelligence",
    icon: "◉",
    page: "Network Intelligence",
  },
  {
    name: "Alert Center",
    icon: "⚠",
    page: "Alert Center",
  },
  {
    name: "AI Investigator",
    icon: "✦",
    page: "AI Investigator",
  },
];

function Sidebar({
  activePage = "Dashboard",
  onNavigate,
}) {
  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-[260px] flex-col border-r border-slate-800 bg-[#0A0F18] text-white">

      {/* Logo */}
      <div className="flex h-[76px] items-center border-b border-slate-800 px-6">
        <div className="flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-xl text-cyan-400 ring-1 ring-cyan-400/20">
            ◈
          </div>

          <div>
            <h1 className="text-sm font-semibold tracking-wide">
              VITTA<span className="text-cyan-400">PALA</span>
            </h1>

            <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-500">
              Fraud Intelligence
            </p>
          </div>

        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6">

        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
          Investigation
        </p>

        <div className="space-y-1">

          {navigationItems.map((item) => {
            const isActive = activePage === item.page;

            return (
              <button
                key={item.page}
                type="button"
                onClick={() => onNavigate?.(item.page)}
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/20"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                }`}
              >

                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-md text-base ${
                    isActive
                      ? "bg-cyan-400/10 text-cyan-300"
                      : "bg-slate-800/50 text-slate-500 group-hover:text-slate-300"
                  }`}
                >
                  {item.icon}
                </span>

                <span className="font-medium">
                  {item.name}
                </span>

                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                )}

              </button>
            );
          })}

        </div>
      </nav>

      {/* System Status */}
      <div className="border-t border-slate-800 p-4">

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">

          <div className="flex items-center gap-2">

            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />

              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>

            <span className="text-xs font-medium text-slate-300">
              Detection Engine
            </span>

          </div>

          <p className="mt-2 text-[11px] text-slate-500">
            System operational
          </p>

        </div>

      </div>
    </aside>
  );
}

export default Sidebar;