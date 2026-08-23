import React, { useEffect, useMemo, useRef, useState } from "react";
import MainLayout from "../components/layout/mainlayout";
import { analyzeTransaction } from "../services/api";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8010/api";

/**
 * Convert a rule evidence object into readable text.
 */
const formatEvidence = (evidence) => {
  if (!evidence || typeof evidence !== "object") {
    return "";
  }

  return Object.entries(evidence)
    .filter(([, value]) => {
      if (value === null || value === undefined || value === "") {
        return false;
      }

      if (Array.isArray(value)) {
        return value.length > 0;
      }

      return true;
    })
    .slice(0, 4)
    .map(([key, value]) => {
      const label = key.replace(/_/g, " ");

      const shown = Array.isArray(value)
        ? value.slice(0, 5).join(", ")
        : String(value);

      return `${label}: ${shown}`;
    })
    .join("  ·  ");
};

function AccountInvestigation({
  accountId: initialAccountId = "",
  onNavigate,
}) {
  /*
   * IMPORTANT:
   * Never allow null / undefined / empty values to become
   * a visible account ID.
   *
   * If no account ID is supplied, the page starts empty.
   */
  const normalizedInitialAccountId =
    initialAccountId === null ||
    initialAccountId === undefined ||
    String(initialAccountId).trim() === "" ||
    String(initialAccountId).toLowerCase() === "null" ||
    String(initialAccountId).toLowerCase() === "undefined"
      ? ""
      : String(initialAccountId).trim();

  const [accountId, setAccountId] = useState(
    normalizedInitialAccountId
  );

  const [searchedAccount, setSearchedAccount] = useState(
    normalizedInitialAccountId
  );

  const [investigation, setInvestigation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Live rule-based / AI analysis result.
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  // UI state for investigation actions.
  const [actionMessage, setActionMessage] = useState("");
  const [alertGenerated, setAlertGenerated] = useState(false);

  /*
   * Prevents stale analysis results from being applied
   * after the user switches accounts.
   */
  const analyzedKeyRef = useRef(null);

  /*
   * Fetch account investigation.
   */
  const fetchInvestigation = async (id) => {
    const safeId = String(id ?? "").trim();

    /*
     * Empty / null / undefined account IDs are invalid.
     *
     * IMPORTANT:
     * Clear the old investigation here so an old account does
     * not remain visible underneath the error message.
     */
    if (
      !safeId ||
      safeId.toLowerCase() === "null" ||
      safeId.toLowerCase() === "undefined"
    ) {
      setInvestigation(null);
      setAnalysis(null);
      setAnalysisError("");
      setSearchedAccount("");
      setError("Please enter a valid account ID.");
      setActionMessage("");
      setAlertGenerated(false);
      analyzedKeyRef.current = null;
      return;
    }

    setLoading(true);
    setError("");
    setActionMessage("");
    setAlertGenerated(false);

    try {
      const response = await fetch(
        `${API_BASE_URL}/accounts/${encodeURIComponent(
          safeId
        )}/investigation`
      );

      if (!response.ok) {
        let message = `Unable to load account investigation (${response.status})`;

        try {
          const errorData = await response.json();

          if (errorData?.detail) {
            message =
              typeof errorData.detail === "string"
                ? errorData.detail
                : JSON.stringify(errorData.detail);
          }
        } catch {
          // Keep default error.
        }

        throw new Error(message);
      }

      const data = await response.json();

      setInvestigation(data);
      setSearchedAccount(safeId);

      /*
       * Keep the input synchronized with the account that
       * was successfully investigated.
       */
      setAccountId(safeId);

      /*
       * Reset live analysis for the newly selected account.
       */
      setAnalysis(null);
      setAnalysisError("");
      analyzedKeyRef.current = null;
    } catch (err) {
      console.error("Account investigation error:", err);

      setInvestigation(null);
      setAnalysis(null);
      setAnalysisError("");
      analyzedKeyRef.current = null;

      setError(
        err.message ||
          "Unable to connect to the investigation API."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
   * Initial account load.
   *
   * IMPORTANT:
   * If no account ID is supplied, do NOT automatically load
   * account 1.
   *
   * This fixes the original behaviour where the page opened
   * with account 1 automatically.
   */
  useEffect(() => {
    if (!normalizedInitialAccountId) {
      setInvestigation(null);
      setAnalysis(null);
      setAnalysisError("");
      setError("");
      setSearchedAccount("");
      setAccountId("");
      setActionMessage("");
      setAlertGenerated(false);
      analyzedKeyRef.current = null;

      return;
    }

    fetchInvestigation(normalizedInitialAccountId);
  }, [normalizedInitialAccountId]);

  /*
   * Search handler.
   */
  const handleSearch = (event) => {
    event.preventDefault();

    const value = accountId.trim();

    /*
     * If the user removes the account ID and presses
     * Investigate Account, completely clear the previous
     * investigation instead of leaving it visible.
     */
    if (
      !value ||
      value.toLowerCase() === "null" ||
      value.toLowerCase() === "undefined"
    ) {
      setInvestigation(null);
      setAnalysis(null);
      setAnalysisError("");
      setSearchedAccount("");
      setError("Please enter a valid account ID.");
      setActionMessage("");
      setAlertGenerated(false);
      analyzedKeyRef.current = null;

      return;
    }

    fetchInvestigation(value);
  };

  /*
   * Handle account ID input changes.
   */
  const handleAccountIdChange = (event) => {
    const value = event.target.value;

    /*
     * Never allow literal "null" or "undefined" to remain
     * in the input.
     */
    if (
      value.toLowerCase() === "null" ||
      value.toLowerCase() === "undefined"
    ) {
      setAccountId("");
      return;
    }

    setAccountId(value);

    /*
     * If the user starts editing the ID, remove an old
     * validation error.
     */
    if (error) {
      setError("");
    }
  };

  const account = investigation?.account;

  const persistedRiskScore =
    investigation?.risk_score || null;

  const alerts = investigation?.alerts || [];
  const transactions = investigation?.transactions || [];

  /*
   * Prefer the live engine result.
   * Fall back to stored backend score.
   */
  const riskScore = analysis
    ? {
        risk_score_id: analysis.risk_score_id,
        risk_score: analysis.risk_score,
        mule_probability: analysis.mule_probability,
        risk_level: analysis.risk_level,
        model_version: analysis.model_version,
        explanation: analysis.explanation,
        scored_at: persistedRiskScore?.scored_at,
      }
    : persistedRiskScore;

  /*
   * Transactions are returned newest first.
   *
   * The latest transaction is used when the user manually
   * runs the detection engine.
   */
  const selectedTransactionId =
    transactions.length > 0
      ? transactions[0].transaction_id
      : null;

  /*
   * Manually run the live analysis.
   *
   * IMPORTANT:
   * This is no longer automatically called when the page loads.
   *
   * That prevents every page visit from creating another
   * risk-analysis POST and potentially increasing alert counts.
   */
  const runLiveAnalysis = async () => {
    if (
      selectedTransactionId === null ||
      selectedTransactionId === undefined
    ) {
      setAnalysisError(
        "No transaction is available for live analysis."
      );
      return;
    }

    const analysisKey = `${searchedAccount}:${selectedTransactionId}`;

    analyzedKeyRef.current = analysisKey;

    setAnalysisLoading(true);
    setAnalysisError("");
    setActionMessage("");

    try {
      const result = await analyzeTransaction(
        selectedTransactionId
      );

      /*
       * Ignore stale results if the user switched accounts while
       * the request was running.
       */
      if (analyzedKeyRef.current !== analysisKey) {
        return;
      }

      if (result) {
        setAnalysis(result);

        setActionMessage(
          "Detection engine completed a fresh analysis."
        );
      } else {
        setAnalysisError(
          "Live analysis is not configured. Showing the stored risk result."
        );
      }
    } catch (err) {
      console.error("Risk analysis error:", err);

      if (analyzedKeyRef.current !== analysisKey) {
        return;
      }

      setAnalysisError(
        err.message ||
          "Unable to run the live risk analysis."
      );
    } finally {
      setAnalysisLoading(false);
    }
  };

  /*
   * IMPORTANT:
   *
   * There is intentionally NO useEffect here that automatically
   * calls runLiveAnalysis().
   *
   * Analysis only runs when the investigator explicitly clicks:
   *
   * - Run AI Analysis
   * - Re-run Analysis
   */

  const riskLevel = String(
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

  const reasons = Array.isArray(explanation.reasons)
    ? explanation.reasons
    : [];

  const triggeredRules = Array.isArray(
    explanation.triggered_rules
  )
    ? explanation.triggered_rules
    : [];

  const findings = Array.isArray(explanation.findings)
    ? explanation.findings
    : [];

  const scoreBreakdown =
    explanation.score_breakdown || {};

  /*
   * Transaction velocity.
   */
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

  /*
   * Unique connected accounts.
   */
  const uniqueCounterparties = useMemo(() => {
    const ids = new Set();

    transactions.forEach((transaction) => {
      if (
        transaction.sender_account_id !== undefined &&
        transaction.sender_account_id !== null &&
        String(transaction.sender_account_id) !==
          String(account?.account_id)
      ) {
        ids.add(transaction.sender_account_id);
      }

      if (
        transaction.receiver_account_id !== undefined &&
        transaction.receiver_account_id !== null &&
        String(transaction.receiver_account_id) !==
          String(account?.account_id)
      ) {
        ids.add(transaction.receiver_account_id);
      }
    });

    return ids.size;
  }, [transactions, account]);

  const networkConnections = uniqueCounterparties;

  /*
   * Behaviour deviation.
   */
  const behaviourDeviation = useMemo(() => {
    const signal =
      explanation.signals?.LARGE_TRANSACTION;

    if (!signal?.ratio) {
      return null;
    }

    return Math.min(
      100,
      Math.round(
        ((Number(signal.ratio) - 1) /
          Math.max(Number(signal.ratio), 1)) *
          100
      )
    );
  }, [explanation]);

  /*
   * Currency formatting.
   */
  const formattedCurrency = (
    amount,
    currency = "INR"
  ) => {
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

  /*
   * Date/time formatting.
   */
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

  /*
   * Investigation action handlers.
   */
  const handleViewTransactions = () => {
    document
      .getElementById("recent-transactions")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

    setActionMessage(
      "Showing recent transaction activity."
    );
  };

  const handleExploreNetwork = () => {
    setActionMessage(
      `Network investigation selected for account ${
        account?.account_id ?? searchedAccount
      }.`
    );

    if (typeof onNavigate === "function") {
      onNavigate("Network Intelligence");
    }
  };

  const handleGenerateAlert = () => {
    setAlertGenerated(true);

    setActionMessage(
      `Alert prepared for account ${
        account?.account_id ?? searchedAccount
      }.`
    );
  };

  return (
    <MainLayout
      activePage="Account Investigation"
      title="Account Investigation"
      subtitle="Investigate account behaviour, transaction patterns and connected risk."
      onNavigate={onNavigate}
    >
      <div className="space-y-6">

        {/* =========================================================
            SEARCH
        ========================================================== */}
        <section className="rounded-2xl border border-slate-800 bg-[#0B111B] p-5">
          <div className="mb-4">
            <p className="text-sm font-semibold text-white">
              Investigate an Account
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Search by account ID to analyse suspicious behaviour
              and transaction activity.
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
                onChange={handleAccountIdChange}
                placeholder="Enter account ID..."
                className="w-full rounded-xl border border-slate-800 bg-[#070C14] py-3 pl-11 pr-4 text-sm text-white outline-none placeholder:text-slate-600 transition focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/10"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Investigating..."
                : "Investigate Account"}
            </button>
          </form>
        </section>

        {/* =========================================================
            ACTION MESSAGE
        ========================================================== */}
        {actionMessage && (
          <section className="rounded-xl border border-cyan-400/10 bg-cyan-400/5 px-4 py-3">
            <p className="text-xs text-cyan-300">
              {actionMessage}
            </p>
          </section>
        )}

        {/* =========================================================
            LOADING
        ========================================================== */}
        {loading && (
          <section className="rounded-2xl border border-slate-800 bg-[#0B111B] p-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />

            <p className="mt-4 text-sm text-slate-400">
              Loading account investigation...
            </p>
          </section>
        )}

        {/* =========================================================
            ERROR
        ========================================================== */}
        {!loading && error && (
          <section className="rounded-2xl border border-red-400/20 bg-red-400/5 p-5">
            <p className="text-sm font-semibold text-red-300">
              Investigation failed
            </p>

            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              {error}
            </p>

            {searchedAccount && (
              <button
                type="button"
                onClick={() =>
                  fetchInvestigation(searchedAccount)
                }
                className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-400/15"
              >
                Try Again
              </button>
            )}
          </section>
        )}

        {!loading && investigation && (
          <>
            {/* =====================================================
                ACCOUNT HEADER
            ====================================================== */}
            <section className="rounded-2xl border border-red-400/20 bg-[#0B111B] p-6 shadow-[0_0_40px_rgba(239,68,68,0.04)]">
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
                      {account?.bank_name ||
                        "Unknown bank"}
                    </p>
                  </div>
                </div>

                {/* Risk score */}
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

            {/* =====================================================
                ACCOUNT DETAILS
            ====================================================== */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

              <div className="rounded-2xl border border-slate-800 bg-[#0B111B] p-5">
                <p className="text-[10px] uppercase tracking-[0.12em] text-slate-600">
                  Current Balance
                </p>

                <p className="mt-3 text-xl font-bold text-white">
                  {formattedCurrency(
                    account?.current_balance
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0B111B] p-5">
                <p className="text-[10px] uppercase tracking-[0.12em] text-slate-600">
                  Account Type
                </p>

                <p className="mt-3 text-xl font-bold capitalize text-cyan-300">
                  {account?.account_type || "—"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#0B111B] p-5">
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

              <div className="rounded-2xl border border-slate-800 bg-[#0B111B] p-5">
                <p className="text-[10px] uppercase tracking-[0.12em] text-slate-600">
                  Date Opened
                </p>

                <p className="mt-3 text-xl font-bold text-violet-300">
                  {formatDate(account?.date_opened)}
                </p>
              </div>

            </section>

            {/* =====================================================
                FRAUD BEHAVIOUR PROFILE
            ====================================================== */}
            <section>
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-white">
                  Fraud Behaviour Profile
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Key behavioural signals identified by the
                  detection engine.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

                <div className="rounded-2xl border border-slate-800 bg-[#0B111B] p-5">
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

                <div className="rounded-2xl border border-slate-800 bg-[#0B111B] p-5">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-600">
                    Counterparties
                  </p>

                  <p className="mt-3 text-2xl font-bold text-amber-300">
                    {uniqueCounterparties}
                  </p>

                  <p className="mt-2 text-xs text-slate-500">
                    Unique connected accounts in returned
                    transactions
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-[#0B111B] p-5">
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

                <div className="rounded-2xl border border-slate-800 bg-[#0B111B] p-5">
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

            {/* =====================================================
                LIVE AI / DETECTION ENGINE
            ====================================================== */}
            <section className="rounded-2xl border border-cyan-400/10 bg-[#0B111B] p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-sm font-semibold text-white">
                      Detection Engine
                    </h2>

                    <span
                      className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wider ring-1 ${
                        analysisLoading
                          ? "bg-cyan-400/10 text-cyan-300 ring-cyan-400/20"
                          : analysis
                          ? "bg-emerald-400/10 text-emerald-300 ring-emerald-400/20"
                          : "bg-slate-400/10 text-slate-400 ring-slate-400/20"
                      }`}
                    >
                      {analysisLoading
                        ? "Running"
                        : analysis
                        ? "Completed"
                        : "Stored Result"}
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    Rule-based transaction analysis and explainable
                    risk scoring.
                  </p>

                  {analysis?.model_version && (
                    <p className="mt-2 text-[10px] uppercase tracking-wider text-slate-600">
                      Engine {analysis.model_version}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  disabled={
                    analysisLoading ||
                    selectedTransactionId === null ||
                    selectedTransactionId === undefined
                  }
                  onClick={runLiveAnalysis}
                  className="rounded-xl bg-cyan-400 px-5 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {analysisLoading
                    ? "Analysing..."
                    : "Run AI Analysis"}
                </button>
              </div>

              {analysisError && (
                <div className="mt-4 rounded-xl border border-amber-400/10 bg-amber-400/5 p-3">
                  <p className="text-xs text-amber-300">
                    {analysisError}
                  </p>
                </div>
              )}

              {analysis && (
                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">

                  <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-slate-600">
                      Rules Triggered
                    </p>

                    <p className="mt-2 text-2xl font-bold text-red-300">
                      {findings.length ||
                        triggeredRules.length ||
                        0}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-slate-600">
                      Risk Score
                    </p>

                    <p className="mt-2 text-2xl font-bold text-violet-300">
                      {Number(
                        analysis.risk_score || 0
                      ).toFixed(0)}
                      /100
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-slate-600">
                      Mule Probability
                    </p>

                    <p className="mt-2 text-2xl font-bold text-amber-300">
                      {(
                        Number(
                          analysis.mule_probability || 0
                        ) * 100
                      ).toFixed(1)}
                      %
                    </p>
                  </div>

                </div>
              )}
            </section>

            {/* =====================================================
                WHY FLAGGED + RISK ASSESSMENT
            ====================================================== */}
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

              {/* Why Flagged */}
              <section className="rounded-2xl border border-slate-800 bg-[#0B111B] p-5">
                <div className="mb-5">
                  <h2 className="text-sm font-semibold text-white">
                    Why This Account Was Flagged
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Explainable evidence behind the AI risk score.
                  </p>
                </div>

                {findings.length > 0 ? (
                  <div className="space-y-3">
                    {findings.map((finding, index) => {
                      const findingSeverity = String(
                        finding.severity || "unknown"
                      ).toUpperCase();

                      const evidenceText =
                        formatEvidence(
                          finding.evidence
                        );

                      return (
                        <div
                          key={`${finding.rule_id || "finding"}-${index}`}
                          className="flex gap-3 rounded-xl border border-red-400/10 bg-red-400/5 p-4"
                        >
                          <span className="text-red-300">
                            ●
                          </span>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-xs font-semibold text-slate-200">
                                {finding.rule_name ||
                                  finding.rule_id ||
                                  `Detection Rule ${
                                    index + 1
                                  }`}
                              </p>

                              <span
                                className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ring-1 ${
                                  riskLevelClasses[
                                    findingSeverity
                                  ] ||
                                  riskLevelClasses.UNKNOWN
                                }`}
                              >
                                {findingSeverity}
                              </span>

                              {typeof finding.confidence ===
                                "number" && (
                                <span className="text-[9px] uppercase tracking-wider text-slate-600">
                                  confidence{" "}
                                  {(
                                    finding.confidence *
                                    100
                                  ).toFixed(0)}
                                  %
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                              {finding.explanation ||
                                finding.description ||
                                "Detection rule triggered."}
                            </p>

                            {evidenceText && (
                              <p className="mt-2 break-words font-mono text-[10px] leading-relaxed text-slate-600">
                                {evidenceText}
                              </p>
                            )}

                            {finding.transaction_ids &&
                              finding.transaction_ids.length >
                                0 && (
                                <p className="mt-1 text-[10px] text-slate-600">
                                  Transactions:{" "}
                                  {finding.transaction_ids
                                    .slice(0, 6)
                                    .join(", ")}
                                  {finding
                                    .transaction_ids.length >
                                    6 && " …"}
                                </p>
                              )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : reasons.length > 0 ? (
                  <div className="space-y-3">
                    {reasons.map((reason, index) => (
                      <div
                        key={`${reason}-${index}`}
                        className="flex gap-3 rounded-xl border border-red-400/10 bg-red-400/5 p-4"
                      >
                        <span className="text-red-300">
                          ●
                        </span>

                        <div>
                          <p className="text-xs font-semibold text-slate-200">
                            {triggeredRules[index] ||
                              `Detection Rule ${
                                index + 1
                              }`}
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
                      No explanation was returned by the risk
                      engine.
                    </p>
                  </div>
                )}
              </section>

              {/* Risk Assessment */}
              <section className="rounded-2xl border border-slate-800 bg-[#0B111B] p-5">
                <div className="mb-5">
                  <h2 className="text-sm font-semibold text-white">
                    Risk Assessment
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Current risk score and rules evaluated by the
                    detection engine.
                  </p>
                </div>

                {Object.keys(scoreBreakdown).length > 0 ? (
                  <>
                    <div className="flex h-[180px] items-end gap-3 border-b border-slate-800 px-2 pb-3">
                      {Object.entries(
                        scoreBreakdown
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
                                Math.max(
                                  8,
                                  Number(value) || 0
                                )
                              )}%`,
                            }}
                            title={`${rule}: ${value}`}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex gap-3 overflow-x-auto text-[10px] text-slate-600">
                      {Object.entries(
                        scoreBreakdown
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

            {/* =====================================================
                ALERTS
            ====================================================== */}
            <section className="rounded-2xl border border-slate-800 bg-[#0B111B] p-5">
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
                                .replaceAll(
                                  "_",
                                  " "
                                )
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
                          {formatDateTime(
                            alert.created_at
                          )}
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

            {/* =====================================================
                TRANSACTIONS
            ====================================================== */}
            <section
              id="recent-transactions"
              className="rounded-2xl border border-slate-800 bg-[#0B111B] p-5"
            >
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Recent Transactions
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Latest transaction activity associated with
                    this account.
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
                      {transactions.map(
                        (transaction) => {
                          const isOutgoing =
                            String(
                              transaction.sender_account_id
                            ) ===
                            String(
                              account?.account_id
                            );

                          return (
                            <tr
                              key={
                                transaction.transaction_id
                              }
                              className="border-b border-slate-800/70 transition hover:bg-slate-900/30"
                            >
                              <td className="px-3 py-4">
                                <p className="text-xs font-semibold text-slate-200">
                                  #
                                  {
                                    transaction.transaction_id
                                  }
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
                                  {isOutgoing
                                    ? "-"
                                    : "+"}
                                  {formattedCurrency(
                                    transaction.amount,
                                    transaction.currency ||
                                      "INR"
                                  )}
                                </span>
                              </td>

                              <td className="px-3 py-4 text-xs text-slate-400">
                                {transaction.channel ||
                                  "—"}
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
                                  {transaction.status ||
                                    "unknown"}
                                </span>
                              </td>

                              <td className="px-3 py-4 text-[10px] text-slate-500">
                                {formatDateTime(
                                  transaction.transaction_timestamp
                                )}
                              </td>
                            </tr>
                          );
                        }
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  No transactions found for this account.
                </p>
              )}
            </section>

            {/* =====================================================
                INVESTIGATION ACTIONS
            ====================================================== */}
            <section className="rounded-2xl border border-slate-800 bg-[#0B111B] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Investigation Actions
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Continue analysing this account and its
                    connected network.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">

                  <button
                    type="button"
                    onClick={handleViewTransactions}
                    className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-cyan-400/30 hover:text-cyan-300"
                  >
                    View Transactions
                  </button>

                  <button
                    type="button"
                    onClick={handleExploreNetwork}
                    className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:border-cyan-400/30 hover:text-cyan-300"
                  >
                    Explore Network
                  </button>

                  <button
                    type="button"
                    onClick={runLiveAnalysis}
                    disabled={
                      analysisLoading ||
                      selectedTransactionId ===
                        null ||
                      selectedTransactionId ===
                        undefined
                    }
                    className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2.5 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {analysisLoading
                      ? "Analysing..."
                      : "Re-run Analysis"}
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateAlert}
                    className={`rounded-xl px-4 py-2.5 text-xs font-bold text-slate-950 transition ${
                      alertGenerated
                        ? "bg-emerald-400 hover:bg-emerald-300"
                        : "bg-red-400 hover:bg-red-300"
                    }`}
                  >
                    {alertGenerated
                      ? "Alert Prepared ✓"
                      : "Generate Alert"}
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