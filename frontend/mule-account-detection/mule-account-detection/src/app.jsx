import React, { useState } from "react";

import Dashboard from "./pages/Dashboard";
import AccountInvestigation from "./pages/AccountInvestigation";
import NetworkIntelligence from "./pages/NetworkIntelligence";
import AlertCenter from "./pages/AlertCenter";
import AIInvestigator from "./pages/AIInvestigator";

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [selectedAccountId, setSelectedAccountId] = useState(null);

  const handleNavigate = (page, accountId = null) => {
    setActivePage(page);

    if (accountId !== null && accountId !== undefined) {
      setSelectedAccountId(accountId);
    }
  };

  const renderPage = () => {
    switch (activePage) {
      case "Dashboard":
        return (
          <Dashboard
            onNavigate={handleNavigate}
          />
        );

      case "Account Investigation":
        return (
          <AccountInvestigation
            accountId={selectedAccountId}
            onNavigate={handleNavigate}
          />
        );

      case "Network Intelligence":
        return (
          <NetworkIntelligence
            accountId={selectedAccountId}
            onNavigate={handleNavigate}
          />
        );

      case "Alert Center":
        return (
          <AlertCenter
            onNavigate={handleNavigate}
          />
        );

      case "AI Investigator":
        return (
          <AIInvestigator
            accountId={selectedAccountId}
            onNavigate={handleNavigate}
          />
        );

      default:
        return (
          <Dashboard
            onNavigate={handleNavigate}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#070B11] text-slate-300">
      {renderPage()}
    </div>
  );
}

export default App;