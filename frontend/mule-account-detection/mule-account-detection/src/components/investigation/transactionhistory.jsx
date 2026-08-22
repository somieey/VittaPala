import React from "react";

const defaultTransactions = [
  {
    id: "TXN-84921",
    date: "22 Aug 2026",
    time: "14:32:18",
    type: "CREDIT",
    amount: "₹4,80,000",
    counterparty: "ACC-78124",
    channel: "UPI",
    status: "FLAGGED",
    risk: "HIGH",
  },
  {
    id: "TXN-84920",
    date: "22 Aug 2026",
    time: "14:27:42",
    type: "DEBIT",
    amount: "₹4,50,000",
    counterparty: "ACC-92817",
    channel: "IMPS",
    status: "FLAGGED",
    risk: "HIGH",
  },
  {
    id: "TXN-84918",
    date: "22 Aug 2026",
    time: "13:51:09",
    type: "CREDIT",
    amount: "₹2,25,000",
    counterparty: "ACC-44291",
    channel: "NEFT",
    status: "COMPLETED",
    risk: "MEDIUM",
  },
  {
    id: "TXN-84912",
    date: "22 Aug 2026",
    time: "12:18:33",
    type: "DEBIT",
    amount: "₹2,10,000",
    counterparty: "ACC-67102",
    channel: "UPI",
    status: "COMPLETED",
    risk: "MEDIUM",
  },
  {
    id: "TXN-84905",
    date: "22 Aug 2026",
    time: "10:42:51",
    type: "CREDIT",
    amount: "₹75,000",
    counterparty: "ACC-19384",
    channel: "UPI",
    status: "COMPLETED",
    risk: "LOW",
  },
];

const riskStyles = {
  HIGH: {
    text: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/20",
  },
  MEDIUM: {
    text: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
  },
  LOW: {
    text: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
  },
};

function TransactionHistory({ transactions = defaultTransactions }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#0B111B]">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
            Financial Activity
          </p>

          <h2 className="mt-1 text-sm font-semibold text-white">
            Transaction History
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-md border border-slate-800 bg-slate-900/50 px-2.5 py-1.5 text-[9px] text-slate-500">
            Last 24 hours
          </span>

          <button
            type="button"
            className="rounded-md border border-cyan-400/20 bg-cyan-400/5 px-2.5 py-1.5 text-[9px] font-medium text-cyan-400 transition hover:bg-cyan-400/10"
          >
            View All
          </button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-800/80 text-left">
              <th className="px-5 py-3 text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                Transaction
              </th>

              <th className="px-3 py-3 text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                Flow
              </th>

              <th className="px-3 py-3 text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                Amount
              </th>

              <th className="px-3 py-3 text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                Counterparty
              </th>

              <th className="px-3 py-3 text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                Channel
              </th>

              <th className="px-3 py-3 text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                Risk
              </th>

              <th className="px-5 py-3 text-[9px] font-semibold uppercase tracking-wider text-slate-600">
                Status
              </th>
            </tr>
          </thead>

          <tbody>
            {transactions.map((transaction) => {
              const risk =
                riskStyles[transaction.risk] || riskStyles.LOW;

              const isCredit = transaction.type === "CREDIT";

              return (
                <tr
                  key={transaction.id}
                  className="border-b border-slate-800/60 transition hover:bg-slate-900/30"
                >
                  {/* Transaction */}
                  <td className="px-5 py-4">
                    <p className="font-mono text-[10px] font-medium text-slate-300">
                      {transaction.id}
                    </p>

                    <p className="mt-1 text-[9px] text-slate-600">
                      {transaction.date} • {transaction.time}
                    </p>
                  </td>

                  {/* Flow */}
                  <td className="px-3 py-4">
                    <div
                      className={`flex w-fit items-center gap-1.5 rounded-md px-2 py-1 ${
                        isCredit
                          ? "bg-emerald-400/10 text-emerald-400"
                          : "bg-orange-400/10 text-orange-400"
                      }`}
                    >
                      <span className="text-xs">
                        {isCredit ? "↓" : "↑"}
                      </span>

                      <span className="text-[9px] font-semibold">
                        {isCredit ? "IN" : "OUT"}
                      </span>
                    </div>
                  </td>

                  {/* Amount */}
                  <td className="px-3 py-4">
                    <p
                      className={`font-mono text-xs font-semibold ${
                        isCredit
                          ? "text-emerald-400"
                          : "text-orange-400"
                      }`}
                    >
                      {isCredit ? "+" : "-"}
                      {transaction.amount}
                    </p>
                  </td>

                  {/* Counterparty */}
                  <td className="px-3 py-4">
                    <p className="font-mono text-[10px] text-slate-400">
                      {transaction.counterparty}
                    </p>
                  </td>

                  {/* Channel */}
                  <td className="px-3 py-4">
                    <span className="rounded-md bg-slate-900 px-2 py-1 text-[9px] font-medium text-slate-500">
                      {transaction.channel}
                    </span>
                  </td>

                  {/* Risk */}
                  <td className="px-3 py-4">
                    <span
                      className={`rounded border px-2 py-1 text-[8px] font-semibold ${risk.bg} ${risk.border} ${risk.text}`}
                    >
                      {transaction.risk}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          transaction.status === "FLAGGED"
                            ? "bg-red-400"
                            : "bg-emerald-400"
                        }`}
                      />

                      <span
                        className={`text-[9px] font-medium ${
                          transaction.status === "FLAGGED"
                            ? "text-red-400"
                            : "text-emerald-400"
                        }`}
                      >
                        {transaction.status}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="space-y-2 p-3 md:hidden">
        {transactions.map((transaction) => {
          const risk =
            riskStyles[transaction.risk] || riskStyles.LOW;

          const isCredit = transaction.type === "CREDIT";

          return (
            <div
              key={transaction.id}
              className="rounded-lg border border-slate-800 bg-slate-900/20 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] font-medium text-slate-300">
                    {transaction.id}
                  </p>

                  <p className="mt-1 text-[9px] text-slate-600">
                    {transaction.date} • {transaction.time}
                  </p>
                </div>

                <span
                  className={`rounded border px-2 py-1 text-[8px] font-semibold ${risk.bg} ${risk.border} ${risk.text}`}
                >
                  {transaction.risk}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-[9px] text-slate-600">
                  {isCredit ? "Received from" : "Sent to"}
                </span>

                <span className="font-mono text-[10px] text-slate-400">
                  {transaction.counterparty}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span
                  className={`text-sm font-semibold ${
                    isCredit
                      ? "text-emerald-400"
                      : "text-orange-400"
                  }`}
                >
                  {isCredit ? "+" : "-"}
                  {transaction.amount}
                </span>

                <span className="rounded-md bg-slate-900 px-2 py-1 text-[9px] text-slate-500">
                  {transaction.channel}
                </span>
              </div>

              <div className="mt-3 border-t border-slate-800 pt-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      transaction.status === "FLAGGED"
                        ? "bg-red-400"
                        : "bg-emerald-400"
                    }`}
                  />

                  <span
                    className={`text-[9px] font-medium ${
                      transaction.status === "FLAGGED"
                        ? "text-red-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {transaction.status}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-800 px-5 py-3">
        <p className="text-[9px] text-slate-600">
          Showing {transactions.length} recent transactions
        </p>

        <p className="font-mono text-[9px] text-slate-700">
          LIVE FEED
        </p>
      </div>
    </div>
  );
}

export default TransactionHistory;