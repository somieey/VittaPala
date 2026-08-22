import React, { useMemo, useState } from "react";
import NetworkGraph from "../components/network/NetworkGraph";
import NetworkControls from "../components/network/NetworkControls";
import NetworkDetails from "../components/network/NetworkDetails";
import MainLayout from "../components/layout/mainlayout";

const nodes = [
  {
    id: "ACC-10234",
    x: 400,
    y: 220,
    label: "ACC-10234",
    type: "TARGET",
    risk: 94,
    amount: "₹10.8L",
  },
  {
    id: "ACC-78124",
    x: 180,
    y: 110,
    label: "ACC-78124",
    type: "SOURCE",
    risk: 82,
    amount: "₹4.8L",
  },
  {
    id: "ACC-92817",
    x: 650,
    y: 100,
    label: "ACC-92817",
    type: "DESTINATION",
    risk: 76,
    amount: "₹4.5L",
  },
  {
    id: "ACC-44291",
    x: 120,
    y: 330,
    label: "ACC-44291",
    type: "SOURCE",
    risk: 38,
    amount: "₹2.25L",
  },
  {
    id: "ACC-67102",
    x: 680,
    y: 350,
    label: "ACC-67102",
    type: "DESTINATION",
    risk: 68,
    amount: "₹2.1L",
  },
  {
    id: "ACC-19384",
    x: 410,
    y: 55,
    label: "ACC-19384",
    type: "SOURCE",
    risk: 24,
    amount: "₹75K",
  },
];

const edges = [
  {
    source: "ACC-78124",
    target: "ACC-10234",
    amount: "₹4.8L",
    risk: "HIGH",
  },
  {
    source: "ACC-44291",
    target: "ACC-10234",
    amount: "₹2.25L",
    risk: "MEDIUM",
  },
  {
    source: "ACC-19384",
    target: "ACC-10234",
    amount: "₹75K",
    risk: "LOW",
  },
  {
    source: "ACC-10234",
    target: "ACC-92817",
    amount: "₹4.5L",
    risk: "HIGH",
  },
  {
    source: "ACC-10234",
    target: "ACC-67102",
    amount: "₹2.1L",
    risk: "MEDIUM",
  },
];

function getRiskLevel(score) {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 40) return "MEDIUM";
  return "LOW";
}

function NetworkIntelligence({ onNavigate }) {
  const [riskFilter, setRiskFilter] = useState("ALL");
  const [depth, setDepth] = useState(2);
  const [viewMode, setViewMode] = useState("FLOW");
  const [selectedNode, setSelectedNode] = useState(nodes[0]);

  const filteredNodes = useMemo(() => {
    if (riskFilter === "ALL") {
      return nodes;
    }

    return nodes.filter(
      (node) => getRiskLevel(node.risk) === riskFilter
    );
  }, [riskFilter]);

  const filteredEdges = useMemo(() => {
    const visibleIds = new Set(
      filteredNodes.map((node) => node.id)
    );

    if (riskFilter === "ALL") {
      return edges;
    }

    return edges.filter(
      (edge) =>
        visibleIds.has(edge.source) &&
        visibleIds.has(edge.target)
    );
  }, [filteredNodes, riskFilter]);

  const handleNodeSelect = (node) => {
    setSelectedNode(node);
  };

  const selectedDetails = {
    account: selectedNode?.label || "ACC-10234",

    riskScore: selectedNode?.risk || 94,

    classification:
      selectedNode?.risk >= 80
        ? "LIKELY MULE"
        : selectedNode?.risk >= 60
        ? "SUSPICIOUS"
        : "LOW RISK",

    incoming:
      selectedNode?.id === "ACC-10234"
        ? "₹7.8L"
        : "₹2.4L",

    outgoing:
      selectedNode?.id === "ACC-10234"
        ? "₹6.7L"
        : "₹1.8L",

    connections:
      selectedNode?.id === "ACC-10234"
        ? 5
        : 2,

    highRiskConnections:
      selectedNode?.risk >= 60
        ? 3
        : 0,

    dominantPattern:
      selectedNode?.id === "ACC-10234"
        ? "Rapid pass-through"
        : "Connected account activity",

    networkRole:
      selectedNode?.id === "ACC-10234"
        ? "CENTRAL NODE"
        : selectedNode?.type || "CONNECTED NODE",
  };

  return (
    <MainLayout
      activePage="Network Intelligence"
      title="Network Intelligence"
      subtitle="Investigate account relationships, money movement, and high-risk network connections"
      onNavigate={onNavigate}
    >
      {/* Page Header */}
      <div className="border-b border-slate-800 bg-[#0B111B]">
        <div className="mx-auto max-w-[1600px] px-5 py-5 lg:px-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.6)]" />

                <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-cyan-400">
                  Network Intelligence
                </span>
              </div>

              <h1 className="mt-2 text-xl font-semibold tracking-tight text-white">
                Money Flow Investigation
              </h1>

              <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-slate-600">
                Investigate account relationships, money movement, and
                high-risk network connections to identify possible mule
                account clusters.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2">
                <p className="text-[8px] uppercase tracking-wider text-slate-600">
                  Network Status
                </p>

                <div className="mt-1 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                  <span className="text-[9px] font-medium text-emerald-400">
                    ANALYZING
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-[9px] font-medium text-cyan-400 transition hover:bg-cyan-400/10"
              >
                Export Network
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-[1600px] p-5 lg:p-7">
        <div className="grid gap-5 xl:grid-cols-[250px_minmax(0,1fr)_280px]">

          {/* Controls */}
          <aside>
            <NetworkControls
              riskFilter={riskFilter}
              depth={depth}
              viewMode={viewMode}
              onRiskFilterChange={setRiskFilter}
              onDepthChange={setDepth}
              onViewModeChange={setViewMode}
            />
          </aside>

          {/* Graph */}
          <section className="min-w-0">
            <NetworkGraph
              nodes={filteredNodes}
              edges={filteredEdges}
              onNodeSelect={handleNodeSelect}
            />

            {/* Active Filters */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[9px] text-slate-600">
                Active filters:
              </span>

              <span className="rounded-md border border-slate-800 bg-slate-900/40 px-2 py-1 text-[8px] text-slate-500">
                Risk: {riskFilter}
              </span>

              <span className="rounded-md border border-slate-800 bg-slate-900/40 px-2 py-1 text-[8px] text-slate-500">
                Depth: {depth} hop{depth > 1 ? "s" : ""}
              </span>

              <span className="rounded-md border border-slate-800 bg-slate-900/40 px-2 py-1 text-[8px] text-slate-500">
                View: {viewMode}
              </span>

              <span className="ml-auto text-[8px] text-slate-700">
                {filteredNodes.length} visible nodes
              </span>
            </div>
          </section>

          {/* Details */}
          <aside>
            <NetworkDetails details={selectedDetails} />
          </aside>
        </div>

        {/* Bottom Security Insight */}
        <div className="mt-5 rounded-xl border border-red-400/10 bg-red-400/[0.02] p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-400/10 text-red-400">
              ⚠
            </div>

            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-300">
                Network Risk Insight
              </p>

              <p className="mt-1 text-[10px] leading-relaxed text-slate-600">
                The selected account acts as a central node between multiple
                counterparties. Rapid movement of funds across high-risk
                connections may indicate possible pass-through or mule
                behaviour.
              </p>
            </div>

            <button
              type="button"
              className="shrink-0 rounded-md border border-red-400/20 bg-red-400/5 px-3 py-2 text-[9px] font-medium text-red-400 transition hover:bg-red-400/10"
            >
              Investigate Connections
            </button>
          </div>
        </div>
      </main>
    </MainLayout>
  );
}

export default NetworkIntelligence;