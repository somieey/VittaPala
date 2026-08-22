import React from "react";

const defaultDetails = {
  account: "ACC-10234",
  riskScore: 94,
  classification: "LIKELY MULE",
  incoming: "₹7.8L",
  outgoing: "₹6.7L",
  connections: 5,
  highRiskConnections: 3,
  dominantPattern: "Rapid pass-through",
  networkRole: "CENTRAL NODE",
};

function NetworkDetails({ details = defaultDetails }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#0B111B] p-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
            Network Intelligence
          </p>

          <h2 className="mt-1 text-sm font-semibold text-white">
            Network Details
          </h2>
        </div>

        <span className="rounded-md border border-red-400/20 bg-red-400/10 px-2 py-1 text-[8px] font-semibold text-red-400">
          {details.classification}
        </span>
      </div>

      {/* Account */}
      <div className="mt-5 rounded-lg border border-slate-800 bg-slate-900/30 p-4">
        <p className="text-[9px] uppercase tracking-wider text-slate-600">
          Selected Account
        </p>

        <div className="mt-2 flex items-center justify-between">
          <p className="font-mono text-sm font-semibold text-slate-200">
            {details.account}
          </p>

          <div className="text-right">
            <p className="text-[8px] uppercase text-slate-600">
              Risk Score
            </p>

            <p className="mt-1 text-lg font-bold text-red-400">
              {details.riskScore}
            </p>
          </div>
        </div>
      </div>

      {/* Money Flow */}
      <div className="mt-4">
        <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-slate-600">
          Money Flow
        </p>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-emerald-400/10 bg-emerald-400/[0.03] p-3">
            <p className="text-[9px] text-slate-600">
              Incoming
            </p>

            <p className="mt-1 text-sm font-semibold text-emerald-400">
              {details.incoming}
            </p>
          </div>

          <div className="rounded-lg border border-orange-400/10 bg-orange-400/[0.03] p-3">
            <p className="text-[9px] text-slate-600">
              Outgoing
            </p>

            <p className="mt-1 text-sm font-semibold text-orange-400">
              {details.outgoing}
            </p>
          </div>
        </div>
      </div>

      {/* Connections */}
      <div className="mt-4">
        <p className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-slate-600">
          Connection Analysis
        </p>

        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg bg-slate-900/40 px-3 py-2.5">
            <span className="text-[10px] text-slate-500">
              Total Connections
            </span>

            <span className="font-mono text-xs text-slate-300">
              {details.connections}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-red-400/[0.03] px-3 py-2.5">
            <span className="text-[10px] text-slate-500">
              High-Risk Connections
            </span>

            <span className="font-mono text-xs text-red-400">
              {details.highRiskConnections}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-slate-900/40 px-3 py-2.5">
            <span className="text-[10px] text-slate-500">
              Network Role
            </span>

            <span className="text-[9px] font-semibold text-purple-400">
              {details.networkRole}
            </span>
          </div>
        </div>
      </div>

      {/* Pattern */}
      <div className="mt-4 rounded-lg border border-purple-400/10 bg-purple-400/[0.03] p-3">
        <p className="text-[9px] uppercase tracking-wider text-slate-600">
          Dominant Network Pattern
        </p>

        <p className="mt-1 text-xs font-semibold text-purple-400">
          {details.dominantPattern}
        </p>

        <p className="mt-2 text-[9px] leading-relaxed text-slate-600">
          Funds enter the account and are rapidly distributed to multiple
          connected entities, indicating possible pass-through behaviour.
        </p>
      </div>

      {/* Alert */}
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-400/10 bg-amber-400/[0.03] p-3">
        <span className="text-[10px] text-amber-400">⚠</span>

        <p className="text-[9px] leading-relaxed text-slate-600">
          Investigate connected high-risk accounts before making a final
          decision on the selected account.
        </p>
      </div>
    </div>
  );
}

export default NetworkDetails;