import React from "react";
import Sidebar from "./sidebar";
import Topbar from "./topbar";

function MainLayout({
  children,
  activePage = "Dashboard",
  title = "Command Center",
  subtitle = "Real-time fraud intelligence and account monitoring",
  onNavigate,
}) {
  return (
    <div className="min-h-screen bg-[#060B12] text-white">
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
      />

      <div className="ml-[260px] min-h-screen">
        <Topbar
          title={title}
          subtitle={subtitle}
        />

        <main className="min-h-[calc(100vh-76px)] p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default MainLayout;