import React, { useState } from "react";

function AccountSearch({ onSearch, loading = false }) {
  const [accountId, setAccountId] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();

    const trimmedId = accountId.trim();

    if (!trimmedId) {
      return;
    }

    onSearch?.(trimmedId);
  };

  const handleClear = () => {
    setAccountId("");
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-[#0B111B] p-5">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-400">
            ⌕
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white">
              Account Investigation
            </h2>

            <p className="mt-0.5 text-[11px] text-slate-500">
              Search an account to analyze its risk and transaction behaviour
            </p>
          </div>
        </div>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            {/* Search Icon */}
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-600">
              ⌕
            </span>

            <input
              type="text"
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              placeholder="Enter account ID e.g. ACC-10234"
              className="h-11 w-full rounded-lg border border-slate-800 bg-[#070C14] pl-11 pr-10 text-sm text-slate-200 outline-none placeholder:text-slate-600 transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/5"
              disabled={loading}
            />

            {/* Clear Button */}
            {accountId && !loading && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-600 transition hover:text-slate-300"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {/* Search Button */}
          <button
            type="submit"
            disabled={!accountId.trim() || loading}
            className="h-11 rounded-lg bg-cyan-400 px-6 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-600"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-cyan-400" />
                Analyzing
              </span>
            ) : (
              "Investigate"
            )}
          </button>
        </div>
      </form>

      {/* Quick Search */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-600">
          Quick search
        </span>

        {["ACC-10234", "ACC-08421", "ACC-01987"].map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setAccountId(id);
              onSearch?.(id);
            }}
            disabled={loading}
            className="rounded-md border border-slate-800 bg-slate-900/40 px-2.5 py-1.5 font-mono text-[10px] text-slate-500 transition hover:border-cyan-400/20 hover:bg-cyan-400/5 hover:text-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {id}
          </button>
        ))}
      </div>

      {/* Security Hint */}
      <div className="mt-4 flex items-start gap-2 border-t border-slate-800/70 pt-4">
        <span className="mt-0.5 text-[11px] text-cyan-400">
          ◈
        </span>

        <p className="text-[10px] leading-relaxed text-slate-600">
          Investigation uses transaction behaviour, network connections,
          anomaly signals, and ML-generated risk indicators.
        </p>
      </div>
    </div>
  );
}

export default AccountSearch;