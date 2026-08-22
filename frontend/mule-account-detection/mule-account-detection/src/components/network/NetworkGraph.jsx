import React, { useMemo, useState } from "react";

const defaultNodes = [
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

const defaultEdges = [
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

function getRiskStyle(risk) {
  if (risk >= 80) {
    return {
      fill: "#EF4444",
      glow: "rgba(239,68,68,0.35)",
      label: "CRITICAL",
    };
  }

  if (risk >= 60) {
    return {
      fill: "#F97316",
      glow: "rgba(249,115,22,0.3)",
      label: "HIGH",
    };
  }

  if (risk >= 40) {
    return {
      fill: "#F59E0B",
      glow: "rgba(245,158,11,0.25)",
      label: "MEDIUM",
    };
  }

  return {
    fill: "#10B981",
    glow: "rgba(16,185,129,0.25)",
    label: "LOW",
  };
}

function NetworkGraph({
  nodes = defaultNodes,
  edges = defaultEdges,
  onNodeSelect,
}) {
  const [selectedNode, setSelectedNode] = useState(null);

  const nodeMap = useMemo(() => {
    return Object.fromEntries(nodes.map((node) => [node.id, node]));
  }, [nodes]);

  const handleNodeClick = (node) => {
    setSelectedNode(node);
    onNodeSelect?.(node);
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-[#080D15]">
      {/* Header */}
      <div className="absolute left-5 right-5 top-5 z-20 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
            Money Flow Intelligence
          </p>

          <h2 className="mt-1 text-sm font-semibold text-white">
            Account Network
          </h2>

          <p className="mt-1 text-[10px] text-slate-600">
            Visual relationship between connected accounts
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-[#0B111B]/90 px-3 py-2 backdrop-blur">
          <p className="text-[9px] uppercase tracking-wider text-slate-600">
            Network Size
          </p>

          <p className="mt-1 text-xs font-semibold text-slate-300">
            {nodes.length} Accounts
          </p>
        </div>
      </div>

      {/* Graph */}
      <div className="h-[520px] w-full overflow-auto pt-20">
        <svg
          viewBox="0 0 800 440"
          className="h-full min-w-[700px] w-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <pattern
              id="networkGrid"
              width="30"
              height="30"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 30 0 L 0 0 0 30"
                fill="none"
                stroke="rgba(148,163,184,0.06)"
                strokeWidth="1"
              />
            </pattern>

            <filter id="nodeGlow">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path
                d="M 0 0 L 10 5 L 0 10 z"
                fill="#475569"
              />
            </marker>
          </defs>

          {/* Background Grid */}
          <rect
            width="800"
            height="440"
            fill="url(#networkGrid)"
          />

          {/* Edges */}
          {edges.map((edge, index) => {
            const source = nodeMap[edge.source];
            const target = nodeMap[edge.target];

            if (!source || !target) {
              return null;
            }

            const riskColor =
              edge.risk === "HIGH"
                ? "#EF4444"
                : edge.risk === "MEDIUM"
                ? "#F59E0B"
                : "#10B981";

            return (
              <g key={`${edge.source}-${edge.target}-${index}`}>
                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={riskColor}
                  strokeOpacity="0.25"
                  strokeWidth="5"
                />

                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={riskColor}
                  strokeOpacity="0.65"
                  strokeWidth="1.5"
                  strokeDasharray="5 4"
                  markerEnd="url(#arrow)"
                />

                {/* Amount Label */}
                <g
                  transform={`translate(
                    ${(source.x + target.x) / 2},
                    ${(source.y + target.y) / 2}
                  )`}
                >
                  <rect
                    x="-28"
                    y="-10"
                    width="56"
                    height="20"
                    rx="5"
                    fill="#0B111B"
                    stroke="#1E293B"
                  />

                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#94A3B8"
                    fontSize="8"
                    fontFamily="monospace"
                  >
                    {edge.amount}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const risk = getRiskStyle(node.risk);
            const isSelected = selectedNode?.id === node.id;
            const isTarget = node.type === "TARGET";

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => handleNodeClick(node)}
                className="cursor-pointer"
              >
                {/* Glow */}
                <circle
                  r={isTarget ? 34 : 25}
                  fill={risk.glow}
                  filter="url(#nodeGlow)"
                />

                {/* Node */}
                <circle
                  r={isTarget ? 27 : 20}
                  fill="#0B111B"
                  stroke={risk.fill}
                  strokeWidth={isSelected ? 4 : 2}
                />

                {/* Inner */}
                <circle
                  r={isTarget ? 8 : 6}
                  fill={risk.fill}
                />

                {/* Account Label */}
                <text
                  y={isTarget ? 48 : 38}
                  textAnchor="middle"
                  fill="#CBD5E1"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {node.label}
                </text>

                {/* Risk */}
                <text
                  y={isTarget ? 62 : 52}
                  textAnchor="middle"
                  fill={risk.fill}
                  fontSize="8"
                  fontWeight="600"
                >
                  {risk.label} • {node.risk}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="absolute bottom-5 left-5 flex flex-wrap gap-4 rounded-lg border border-slate-800 bg-[#0B111B]/90 px-3 py-2 backdrop-blur">
        {[
          ["#EF4444", "Critical"],
          ["#F97316", "High"],
          ["#F59E0B", "Medium"],
          ["#10B981", "Low"],
        ].map(([color, label]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: color }}
            />

            <span className="text-[9px] text-slate-500">
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Selected Node */}
      {selectedNode && (
        <div className="absolute bottom-5 right-5 w-56 rounded-xl border border-slate-800 bg-[#0B111B]/95 p-4 shadow-2xl backdrop-blur">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-slate-600">
                Selected Account
              </p>

              <p className="mt-1 font-mono text-xs font-semibold text-white">
                {selectedNode.label}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedNode(null)}
              className="text-xs text-slate-600 hover:text-white"
            >
              ×
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-slate-900/70 p-2">
              <p className="text-[8px] text-slate-600">
                Risk Score
              </p>

              <p
                className="mt-1 text-sm font-semibold"
                style={{
                  color: getRiskStyle(selectedNode.risk).fill,
                }}
              >
                {selectedNode.risk}
              </p>
            </div>

            <div className="rounded-lg bg-slate-900/70 p-2">
              <p className="text-[8px] text-slate-600">
                Flow
              </p>

              <p className="mt-1 text-xs font-semibold text-slate-300">
                {selectedNode.amount}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NetworkGraph;