import React, { useEffect, useState } from "react";
import MainLayout from "../components/layout/mainlayout";

function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);

  const [alerts, setAlerts] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertsError, setAlertsError] = useState(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/dashboard/stats")
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to load dashboard stats: ${response.status}`
          );
        }

        return response.json();
      })
      .then((data) => {
        setStats(data);
      })
      .catch((error) => {
        console.error("Dashboard stats error:", error);
        setStatsError("Unable to load dashboard statistics");
      })
      .finally(() => {
        setStatsLoading(false);
      });
  }, []);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/alerts/")
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to load alerts: ${response.status}`
          );
        }

        return response.json();
      })
      .then((data) => {
        setAlerts(data);
      })
      .catch((error) => {
        console.error("Alert loading error:", error);
        setAlertsError("Unable to load alerts");
      })
      .finally(() => {
        setAlertsLoading(false);
      });
  }, []);

  const recentAlerts = alerts
    .filter(
      (alert) =>
        alert.severity === "critical" ||
        alert.severity === "high"
    )
    .slice(0, 3);

  return (
    <MainLayout
      activePage="Command Center"
      title="Command Center"
      subtitle="Real-time fraud intelligence and mule account monitoring"
      onNavigate={onNavigate}
    >
      <div className="space-y-6">

        {/* Welcome Section */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
          <h1 className="text-2xl font-bold text-white">
            AI-Powered Fraud Intelligence Platform
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Monitor suspicious accounts, detect mule networks,
            analyze money flow patterns, and investigate
            fraud campaigns in real time.
          </p>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

          {/* Total Accounts */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-sm text-slate-500">
              Total Accounts
            </p>

            <h2 className="mt-2 text-3xl font-bold text-white">
              {statsLoading
                ? "..."
                : statsError
                  ? "--"
                  : stats?.total_accounts ?? 0}
            </h2>
          </div>

          {/* High Risk Accounts */}
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
            <p className="text-sm text-red-300">
              High Risk Accounts
            </p>

            <h2 className="mt-2 text-3xl font-bold text-red-400">
              {statsLoading
                ? "..."
                : statsError
                  ? "--"
                  : stats?.high_risk_accounts ?? 0}
            </h2>
          </div>

          {/* Critical Alerts */}
          <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-5">
            <p className="text-sm text-orange-300">
              Critical Alerts
            </p>

            <h2 className="mt-2 text-3xl font-bold text-orange-400">
              {statsLoading
                ? "..."
                : statsError
                  ? "--"
                  : stats?.critical_alerts ?? 0}
            </h2>
          </div>

          {/* Mule Accounts */}
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5">
            <p className="text-sm text-cyan-300">
              Mule Accounts
            </p>

            <h2 className="mt-2 text-3xl font-bold text-cyan-400">
              {statsLoading
                ? "..."
                : statsError
                  ? "--"
                  : stats?.mule_accounts ?? 0}
            </h2>
          </div>

        </div>

        {/* Risk Overview */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

          {/* Risk Distribution */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="text-lg font-semibold text-white">
              Risk Distribution
            </h3>

            {statsLoading ? (
              <p className="mt-6 text-sm text-slate-500">
                Loading risk distribution...
              </p>
            ) : statsError ? (
              <p className="mt-6 text-sm text-red-400">
                Unable to load risk distribution
              </p>
            ) : (
              <div className="mt-6 space-y-4">

                {/* Low Risk */}
                <div>
                  <div className="mb-1 flex justify-between">
                    <span className="text-sm text-slate-400">
                      Low Risk
                    </span>

                    <span className="text-sm text-emerald-400">
                      {stats?.risk_distribution?.low ?? 0}%
                    </span>
                  </div>

                  <div className="h-2 rounded-full bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-emerald-400"
                      style={{
                        width: `${stats?.risk_distribution?.low ?? 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Medium Risk */}
                <div>
                  <div className="mb-1 flex justify-between">
                    <span className="text-sm text-slate-400">
                      Medium Risk
                    </span>

                    <span className="text-sm text-yellow-400">
                      {stats?.risk_distribution?.medium ?? 0}%
                    </span>
                  </div>

                  <div className="h-2 rounded-full bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-yellow-400"
                      style={{
                        width: `${stats?.risk_distribution?.medium ?? 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* High Risk */}
                <div>
                  <div className="mb-1 flex justify-between">
                    <span className="text-sm text-slate-400">
                      High Risk
                    </span>

                    <span className="text-sm text-red-400">
                      {stats?.risk_distribution?.high ?? 0}%
                    </span>
                  </div>

                  <div className="h-2 rounded-full bg-red-400/20">
                    <div
                      className="h-2 rounded-full bg-red-400"
                      style={{
                        width: `${stats?.risk_distribution?.high ?? 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Critical Risk */}
                <div>
                  <div className="mb-1 flex justify-between">
                    <span className="text-sm text-slate-400">
                      Critical Risk
                    </span>

                    <span className="text-sm text-orange-400">
                      {stats?.risk_distribution?.critical ?? 0}%
                    </span>
                  </div>

                  <div className="h-2 rounded-full bg-orange-400/20">
                    <div
                      className="h-2 rounded-full bg-orange-400"
                      style={{
                        width: `${stats?.risk_distribution?.critical ?? 0}%`,
                      }}
                    />
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Recent Alerts */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="text-lg font-semibold text-white">
              Recent Critical Alerts
            </h3>

            <div className="mt-4 space-y-3">

              {alertsLoading && (
                <p className="text-sm text-slate-500">
                  Loading alerts...
                </p>
              )}

              {alertsError && (
                <p className="text-sm text-red-400">
                  {alertsError}
                </p>
              )}

              {!alertsLoading &&
                !alertsError &&
                recentAlerts.length === 0 && (
                  <p className="text-sm text-slate-500">
                    No high-risk alerts found.
                  </p>
                )}

              {!alertsLoading &&
                !alertsError &&
                recentAlerts.map((alert) => (
                  <div
                    key={alert.alert_id}
                    className="rounded-lg border border-red-500/20 bg-red-500/5 p-4"
                  >
                    <p className="font-medium text-red-400">
                      Account #{alert.account_id}
                    </p>

                    <p className="mt-1 text-xs capitalize text-slate-400">
                      {alert.alert_type.replaceAll("_", " ")}
                      {" · "}
                      {alert.severity}
                    </p>

                    {alert.reason && (
                      <p className="mt-2 text-xs text-slate-500">
                        {alert.reason}
                      </p>
                    )}
                  </div>
                ))}
            </div>
          </div>

        </div>

      </div>
    </MainLayout>
  );
}

export default Dashboard;
