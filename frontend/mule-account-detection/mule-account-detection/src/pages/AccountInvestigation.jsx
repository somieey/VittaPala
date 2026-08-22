import React, { useEffect, useMemo, useState } from "react";
import MainLayout from "../components/layout/mainlayout";

const API_BASE_URL = "http://127.0.0.1:8000";

function AccountInvestigation({
  accountId: initialAccountId = "1",
  onNavigate,
}) {
  const [accountId, setAccountId] = useState(
    String(initialAccountId)
  );
  const [searchedAccount, setSearchedAccount] = useState(
    String(initialAccountId)
  );
  const [investigation, setInvestigation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchInvestigation = async (id) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/accounts/${encodeURIComponent(id)}/investigation`
      );

      if (!response.ok) {
        let message = `Unable to load account investigation (${response.status})`;

        try {
          const errorData = await response.json();

          if (errorData?.detail) {
            message = errorData.detail;
          }
        } catch {
          // Keep the default error message.
        }

        throw new Error(message);
      }

      const data = await response.json();

      setInvestigation(data);
      setSearchedAccount(id);
    } catch (err) {
      console.error("Account investigation error:", err);

      setInvestigation(null);
      setError(
        err.message || "Unable to connect to the investigation API."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestigation("1");
  }, []);

  const handleSearch = (event) => {
    event.preventDefault();

    const value = accountId.trim();

    if (!value) {
      setError("Please enter an account ID.");
      return;
    }

    fetchInvestigation(value);
  };

  const account = investigation?.account;
  const riskScore = investigation?.risk_score;
  const alerts = investigation?.alerts || [];
  const transactions = investigation?.transactions || [];

  const riskLevel = (
    riskScore?.risk_level || "unknown"
  ).toUpperCase();

  const riskLevelClasses = {
    CRITICAL:
      "bg-red-400/10 text-red-300 ring-red-400/20",
    HIGH:
      "bg-red-400/10 text-red-300 ring-red-400/20",
    MEDIUM:
      "bg-amber-400/10 text-amber-300 ring-amber-400/20",
    LOW:
      "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20",
    UNKNOWN:
      "bg-slate-400/10 text-slate-300 ring-slate-400/20",
  };

  const riskColorClasses = {
    CRITICAL: "text-red-300",
    HIGH: "text-red-300",
    MEDIUM: "text-amber-300",
    LOW: "text-emerald-300",
    UNKNOWN: "text-slate-300",
  };

  const explanation = riskScore?.explanation || {};
  const reasons = explanation.reasons || [];
  const triggeredRules = explanation.triggered_rules || [];

  const transactionVelocity = useMemo(() => {
    if (!transactions.length) {
      return {
        label: "No Data",
        detail: "No transactions available",
      };
    }

    const recentTransactions = transactions.slice(0, 5);

    if (recentTransactions.length >= 5) {
      return {
        label: "High",
        detail: `${recentTransactions.length} recent transactions detected`,
      };
    }

    return {
      label: "Normal",
      detail: `${transactions.length} transactions available`,
    };
  }, [transactions]);

  const uniqueCounterparties = useMemo(() => {
    const ids = new Set();

    transactions.forEach((transaction) => {
      if (
        transaction.sender_account_id !== undefined &&
        transaction.sender_account_id !== account?.account_id
      ) {
        ids.add(transaction.sender_account_id);
      }

      if (
        transaction.receiver_account_id !== undefined &&
        transaction.receiver_account_id !== account?.account_id
      ) {
        ids.add(transaction.receiver_account_id);
      }
    });

    return ids.size;
  }, [transactions, account]);

  const networkConnections = useMemo(() => {
    const ids = new Set();

    transactions.forEach((transaction) => {
      if (
        transaction.sender_account_id !== undefined &&
        transaction.sender_account_id !== account?.account_id
      ) {
        ids.add(transaction.sender_account_id);
      }

      if (
        transaction.receiver_account_id !== undefined &&
        transaction.receiver_account_id !== account?.account_id
      ) {
        ids.add(transaction.receiver_account_id);
      }
    });

    return ids.size;
  }, [transactions, account]);

  const behaviourDeviation = useMemo(() => {
    const signal = explanation.signals?.LARGE_TRANSACTION;

    if (!signal?.ratio) {
      return null;
    }

    return Math.min(
      100,
      Math.round(
        ((signal.ratio - 1) / Math.max(signal.ratio, 1)) * 100
      )
    );
  }, [explanation]);

  const formattedCurrency = (amount, currency = "INR") => {
    if (amount === null || amount === undefined) {
      return "—";
    }

    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(Number(amount));
    } catch {
      return `${currency} ${amount}`;
    }
  };

  const formatDateTime = (value) => {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const formatDate = (value) => {
    if (!value) {
      return "—";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <MainLayout
      activePage="Account Investigation"
      title="Account Investigation"
      subtitle="Investigate account behaviour, transaction patterns and connected risk."
      onNavigate={onNavigate}
    >
      <div className="space-y-6">

        {/* Search Section */}
        <section className="rounded-2xl border border-slate-800 bg-[#0B111C] p-5">
          <div className="mb-4">
            <p className="text-sm font-semibold text-white">
              Investigate an Account
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Search by account ID to analyse suspicious behaviour and
              transaction activity.
            </p>
          </div>

          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-600">
                ⌕
              </span>

              <input
                type="text"
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
                placeholder="Enter account ID..."
                className="w-full rounded-xl border border-slate-800 bg-[#070C14] py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-slate-600 transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Investigating..." : "Investigate Account"}
            </button>
          </form>
        </section>

        {/* Loading */}
        {loading && (
          <section className="rounded-2xl border border-slate-800 bg-[#0B111C] p-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />

            <p className="mt-4 text-sm text-slate-400">
              Loading account investigation...
            </p>
          </section>
        )}

        {/* Error */}
        {!loading && error && (
          <section className="rounded-2xl border border-red-400/20 bg-red-400/5 p-5">
            <p className="text-sm font-semibold text-red-300">
              Investigation failed
            </p>

            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              {error}
            </p>

            <button
              type="button"
              onClick={() => fetchInvestigation(searchedAccount)}
              className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-400/15"
            >
              Try Again
            </button>
          </section>
        )}

        {!loading && investigation && (
          <>
            {/* Account Header */}
            <section className="rounded-2xl border border-red-400/20 bg-[#0B111C] p-6 shadow-[0_0_40px_rgba(239,68,68,0.04)]">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">

                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-400/10 text-xl text-red-300 ring-1 ring-red-400/20">
                    ⚠
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h1 className="text-xl font-bold text-white">
                        {account?.account_number ||
                          `Account #${searchedAccount}`}
                      </h1>

                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 ${
                          riskLevelClasses[riskLevel] ||
                          riskLevelClasses.UNKNOWN
                        }`}
                      >
                        {riskLevel} RISK
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-500">
                      {account?.account_holder_name ||
                        "Unknown account holder"}
                      {" · "}
                      {account?.bank_name || "Unknown bank"}
                    </p>
                  </div>
                </div>

                {/* Risk Score */}
                <div className="flex items-center gap-5">
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-slate-600">
                      AI Risk Score
                    </p>

                    <p
                      className={`mt-1 text-4xl font-bold ${
                        riskColorClasses[riskLevel] ||
                        riskColorClasses.UNKNOWN
                      }`}
                    >
                      {Number(
                        riskScore?.risk_score || 0
                      ).toFixed(0)}

                      <span className="text-sm font-normal text-slate-600">
                        /100
                      </span>
                    </p>
                  </div>

                  <div className="h-14 w-px bg-slate-800" />

                  <div>
                    <p className="text-[10px] uppercase tracking-[0.15em] text-slate-600">
                      Mule Probability
                    </p>

                    <p className="mt-1 text-xl font-bold text-amber-300">
                      {(
                        Number(
                          riskScore?.mule_probability || 0
                        ) * 100
                      ).toFixed(1)}
                      %
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Account Details */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

              <div className="rounded-2xl border border-slate-800 bg-[#0B111C] p-5">
                <p className="text-[10px] uppercase tracking-[0.12em] text-slate-600">
                  Current Balance
                </p>

                <p className="mt-3 text-xl font-bold text-white">
                  {formattedCurrency(account?.current_balance)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0B111C] p-5">
                <p className="text-[10px] uppercase tracking-[0.12em] text-slate-600">
                  Account Type
                </p>

                <p className="mt-3 text-xl font-bold capitalize text-cyan-300">
                  {account?.account_type || "—"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0B111C] p-5">
                <p className="text-[10px] uppercase tracking-[0.12em] text-slate-600">
                  KYC Status
                </p>

                <p
                  className={`mt-3 text-xl font-bold ${
                    account?.kyc_verified
                      ? "text-emerald-300"
                      : "text-red-300"
                  }`}
                >
                  {account?.kyc_verified
                    ? "Verified"
                    : "Not Verified"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0B111C] p-5">
                <p className="text-[10px] uppercase tracking-[0.12em] text-slate-600">
                  Date Opened
                </p>

                <p className="mt-3 text-xl font-bold text-violet-300">
                  {formatDate(account?.date_opened)}
                </p>
              </div>

            </section>

            {/* Fraud Behaviour Profile */}
            <section>
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-white">
                  Fraud Behaviour Profile
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Key behavioural signals identified by the detection engine.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

                <div className="rounded-2xl border border-slate-800 bg-[#0B111C] p-5">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-600">
                    Transaction Velocity
                  </p>

                  <p className="mt-3 text-2xl font-bold text-red-300">
                    {transactionVelocity.label}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    {transactionVelocity.detail}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-[#0B111C] p-5">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-600">
                    Counterparties
                  </p>

                  <p className="mt-3 text-2xl font-bold text-amber-300">
                    {uniqueCounterparties}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    Unique connected accounts in returned transactions
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-[#0B111C] p-5">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-600">
                    Transaction Anomaly
                  </p>

                  <p className="mt-3 text-2xl font-bold text-violet-300">
                    {behaviourDeviation !== null
                      ? `${behaviourDeviation}%`
                      : "N/A"}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    Derived from the large-transaction signal
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-[#0B111C] p-5">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-600">
                    Network Connections
                  </p>

                  <p className="mt-3 text-2xl font-bold text-cyan-300">
                    {networkConnections}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    Unique counterparties in transaction history
                  </p>
                </div>

              </div>
            </section>

            {/* Why Flagged + Risk Assessment */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

              {/* Why Flagged */}
              <section className="rounded-2xl border border-slate-800 bg-[#0B111C] p-5">
                <div className="mb-5">
                  <h2 className="text-sm font-semibold text-white">
                    Why This Account Was Flagged
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Explainable evidence behind the AI risk score.
                  </p>
                </div>

                {reasons.length > 0 ? (
                  <div className="space-y-3">
                    {reasons.map((reason, index) => (
                      <div
                        key={`${reason}-${index}`}
                        className="flex gap-3 rounded-xl border border-red-400/10 bg-red-400/5 p-4"
                      >
                        <span className="text-red-300">●</span>

                        <div>
                          <p className="text-xs font-semibold text-slate-200">
                            {triggeredRules[index] ||
                              `Detection Rule ${index + 1}`}
                          </p>

                          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                            {reason}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
                    <p className="text-xs text-slate-500">
                      No explanation was returned by the risk engine.
                    </p>
                  </div>
                )}
              </section>

              {/* Risk Assessment */}
              <section className="rounded-2xl border border-slate-800 bg-[#0B111C] p-5">
                <div className="mb-5">
                  <h2 className="text-sm font-semibold text-white">
                    Risk Assessment
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Current risk score and rules evaluated by the detection
                    engine.
                  </p>
                </div>

                {Object.keys(explanation.score_breakdown || {}).length > 0 ? (
                  <>
                    <div className="flex h-[180px] items-end gap-3 border-b border-slate-800 px-2 pb-3">
                      {Object.entries(
                        explanation.score_breakdown || {}
                      ).map(([rule, value]) => (
                        <div
                          key={rule}
                          className="group flex h-full min-w-0 flex-1 items-end"
                        >
                          <div
                            className="w-full rounded-t-md bg-gradient-to-t from-cyan-500/20 to-red-400/70 transition group-hover:from-cyan-500/30 group-hover:to-red-300"
                            style={{
                              height: `${Math.min(
                                100,
                                Math.max(8, Number(value))
                              )}%`,
                            }}
                            title={`${rule}: ${value}`}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex gap-3 overflow-x-auto text-[10px] text-slate-600">
                      {Object.entries(
                        explanation.score_breakdown || {}
                      ).map(([rule, value]) => (
                        <span
                          key={rule}
                          className="whitespace-nowrap"
                        >
                          {rule}: {value}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
                    <p className="text-xs text-slate-500">
                      No score breakdown was returned.
                    </p>
                  </div>
                )}

                <div className="mt-5 flex items-center justify-between rounded-xl border border-red-400/10 bg-red-400/5 p-3">
                  <span className="text-xs text-slate-400">
                    Current risk level
                  </span>

                  <span
                    className={`text-xs font-bold ${
                      riskColorClasses[riskLevel] ||
                      riskColorClasses.UNKNOWN
                    }`}
                  >
                    {riskLevel} ·{" "}
                    {Number(
                      riskScore?.risk_score || 0
                    ).toFixed(0)}
                    /100
                  </span>
                </div>
              </section>

            </div>

            {/* Alerts */}
            <section className="rounded-2xl border border-slate-800 bg-[#0B111C] p-5">
              <div className="mb-5">
                <h2 className="text-sm font-semibold text-white">
                  Fraud Alerts
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Alerts generated by the fraud detection engine.
                </p>
              </div>

              {alerts.length > 0 ? (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.alert_id}
                      className="rounded-xl border border-red-400/10 bg-red-400/5 p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-slate-200">
                              {String(
                                alert.alert_type || ""
                              )
                                .replaceAll("_", " ")
                                .toUpperCase()}
                            </span>

                            <span className="rounded-full bg-red-400/10 px-2 py-1 text-[9px] font-bold uppercase text-red-300">
                              {alert.severity}
                            </span>

                            <span className="rounded-full bg-amber-400/10 px-2 py-1 text-[9px] font-bold uppercase text-amber-300">
                              {alert.status}
                            </span>
                          </div>

                          <p className="mt-2 text-xs leading-relaxed text-slate-400">
                            {alert.reason}
                          </p>
                        </div>

                        <div className="shrink-0 text-[10px] text-slate-600">
                          {formatDateTime(alert.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  No fraud alerts found for this account.
                </p>
              )}
            </section>

            {/* Transactions */}
            <section
              id="recent-transactions"
              className="rounded-2xl border border-slate-800 bg-[#0B111C] p-5"
            >
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Recent Transactions
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Latest transaction activity associated with this account.
                  </p>
                </div>

                <span className="text-[10px] uppercase tracking-wider text-slate-600">
                  {transactions.length} transactions
                </span>
              </div>

              {transactions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] text-left">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="px-3 py-3 text-[10px] uppercase tracking-wider text-slate-600">
                          Transaction
                        </th>

                        <th className="px-3 py-3 text-[10px] uppercase tracking-wider text-slate-600">
                          Amount
                        </th>

                        <th className="px-3 py-3 text-[10px] uppercase tracking-wider text-slate-600">
                          Channel
                        </th>

                        <th className="px-3 py-3 text-[10px] uppercase tracking-wider text-slate-600">
                          Direction
                        </th>

                        <th className="px-3 py-3 text-[10px] uppercase tracking-wider text-slate-600">
                          Status
                        </th>

                        <th className="px-3 py-3 text-[10px] uppercase tracking-wider text-slate-600">
                          Time
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {transactions.map((transaction) => {
                        const isOutgoing =
                          transaction.sender_account_id ===
                          account?.account_id;

                        return (
                          <tr
                            key={transaction.transaction_id}
                            className="border-b border-slate-800/70 transition hover:bg-slate-900/30"
                          >
                            <td className="px-3 py-4">
                              <p className="text-xs font-semibold text-slate-200">
                                #{transaction.transaction_id}
                              </p>

                              <p className="mt-1 max-w-[280px] truncate text-[10px] text-slate-600">
                                {transaction.description ||
                                  "No description"}
                              </p>
                            </td>

                            <td className="px-3 py-4">
                              <span
                                className={`text-xs font-bold ${
                                  isOutgoing
                                    ? "text-red-300"
                                    : "text-emerald-300"
                                }`}
                              >
                                {isOutgoing ? "-" : "+"}
                                {formattedCurrency(
                                  transaction.amount,
                                  transaction.currency || "INR"
                                )}
                              </span>
                            </td>

                            <td className="px-3 py-4 text-xs text-slate-400">
                              {transaction.channel || "—"}
                            </td>

                            <td className="px-3 py-4">
                              <span className="text-[10px] font-semibold uppercase text-slate-500">
                                {isOutgoing
                                  ? "Outgoing"
                                  : "Incoming"}
                              </span>
                            </td>

                            <td className="px-3 py-4">
                              <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[9px] font-bold uppercase text-emerald-300">
                                {transaction.status || "unknown"}
                              </span>
                            </td>

                            <td className="px-3 py-4 text-[10px] text-slate-500">
                              {formatDateTime(
                                transaction.transaction_timestamp
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  No transactions found for this account.
                </p>
              )}
            </section>

            {/* Investigation Actions */}
            <section className="rounded-2xl border border-slate-800 bg-[#0B111C] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Investigation Actions
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Continue analysing this account and its connected network.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">

                  <button
                    type="button"
                    onClick={() => {
                      document
                        .getElementById("recent-transactions")
                        ?.scrollIntoView({
                          behavior: "smooth",
                        });
                    }}
                    className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-cyan-400/30 hover:text-cyan-300"
                  >
                    View Transactions
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      alert(
                        `Network exploration for account ${account?.account_id} will be implemented in the network investigation module.`
                      );
                    }}
                    className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-cyan-400/30 hover:text-cyan-300"
                  >
                    Explore Network
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      alert(
                        `Alert generation is ready for account ${account?.account_id}.`
                      );
                    }}
                    className="rounded-xl bg-red-400 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-red-300"
                  >
                    Generate Alert
                  </button>

                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </MainLayout>
  );
}

export default AccountInvestigation;