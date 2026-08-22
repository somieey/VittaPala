const mockNetwork = {
  nodes: [
    {
      id: "ACC-10234",
      label: "ACC-10234",
      type: "ACCOUNT",

      riskScore: 94,
      riskLevel: "CRITICAL",

      muleProbability: 92,

      totalIncoming: 1085000,
      totalOutgoing: 932000,

      connections: 5,

      position: {
        x: 50,
        y: 50,
      },
    },

    {
      id: "ACC-78124",
      label: "ACC-78124",
      type: "ACCOUNT",

      riskScore: 86,
      riskLevel: "HIGH",

      muleProbability: 78,

      totalIncoming: 682000,
      totalOutgoing: 541000,

      connections: 4,

      position: {
        x: 25,
        y: 25,
      },
    },

    {
      id: "ACC-92817",
      label: "ACC-92817",
      type: "ACCOUNT",

      riskScore: 81,
      riskLevel: "HIGH",

      muleProbability: 73,

      totalIncoming: 475000,
      totalOutgoing: 429000,

      connections: 4,

      position: {
        x: 75,
        y: 28,
      },
    },

    {
      id: "ACC-44291",
      label: "ACC-44291",
      type: "ACCOUNT",

      riskScore: 61,
      riskLevel: "MEDIUM",

      muleProbability: 48,

      totalIncoming: 318000,
      totalOutgoing: 271000,

      connections: 3,

      position: {
        x: 22,
        y: 72,
      },
    },

    {
      id: "ACC-67102",
      label: "ACC-67102",
      type: "ACCOUNT",

      riskScore: 32,
      riskLevel: "LOW",

      muleProbability: 12,

      totalIncoming: 156000,
      totalOutgoing: 129000,

      connections: 2,

      position: {
        x: 78,
        y: 73,
      },
    },

    {
      id: "ACC-55120",
      label: "ACC-55120",
      type: "EXTERNAL",

      riskScore: 74,
      riskLevel: "HIGH",

      muleProbability: 67,

      totalIncoming: 185000,
      totalOutgoing: 0,

      connections: 1,

      position: {
        x: 5,
        y: 48,
      },
    },

    {
      id: "ACC-88321",
      label: "ACC-88321",
      type: "EXTERNAL",

      riskScore: 69,
      riskLevel: "HIGH",

      muleProbability: 61,

      totalIncoming: 245000,
      totalOutgoing: 0,

      connections: 1,

      position: {
        x: 95,
        y: 48,
      },
    },

    {
      id: "ACC-44901",
      label: "ACC-44901",
      type: "EXTERNAL",

      riskScore: 77,
      riskLevel: "HIGH",

      muleProbability: 71,

      totalIncoming: 0,
      totalOutgoing: 138000,

      connections: 1,

      position: {
        x: 95,
        y: 90,
      },
    },
  ],

  edges: [
    {
      id: "EDGE-001",

      source: "ACC-55120",
      target: "ACC-10234",

      amount: 185000,

      transactionCount: 1,

      direction: "INCOMING",

      riskLevel: "HIGH",

      timestamp: "2026-08-22 09:12",
    },

    {
      id: "EDGE-002",

      source: "ACC-10234",
      target: "ACC-67102",

      amount: 172000,

      transactionCount: 1,

      direction: "OUTGOING",

      riskLevel: "HIGH",

      timestamp: "2026-08-22 09:28",
    },

    {
      id: "EDGE-003",

      source: "ACC-88321",
      target: "ACC-10234",

      amount: 245000,

      transactionCount: 1,

      direction: "INCOMING",

      riskLevel: "HIGH",

      timestamp: "2026-08-22 10:14",
    },

    {
      id: "EDGE-004",

      source: "ACC-10234",
      target: "ACC-92817",

      amount: 228000,

      transactionCount: 1,

      direction: "OUTGOING",

      riskLevel: "CRITICAL",

      timestamp: "2026-08-22 10:31",
    },

    {
      id: "EDGE-005",

      source: "ACC-78124",
      target: "ACC-92817",

      amount: 87000,

      transactionCount: 1,

      direction: "OUTGOING",

      riskLevel: "HIGH",

      timestamp: "2026-08-22 11:18",
    },

    {
      id: "EDGE-006",

      source: "ACC-10234",
      target: "ACC-92817",

      amount: 142000,

      transactionCount: 1,

      direction: "OUTGOING",

      riskLevel: "HIGH",

      timestamp: "2026-08-22 11:47",
    },

    {
      id: "EDGE-007",

      source: "ACC-92817",
      target: "ACC-44901",

      amount: 138000,

      transactionCount: 1,

      direction: "OUTGOING",

      riskLevel: "HIGH",

      timestamp: "2026-08-22 12:02",
    },

    {
      id: "EDGE-008",

      source: "ACC-44291",
      target: "ACC-67102",

      amount: 72000,

      transactionCount: 1,

      direction: "OUTGOING",

      riskLevel: "MEDIUM",

      timestamp: "2026-08-22 10:45",
    },
  ],

  clusters: [
    {
      id: "CLUSTER-01",
      name: "High Risk Flow Cluster",
      riskLevel: "CRITICAL",

      members: [
        "ACC-10234",
        "ACC-92817",
        "ACC-78124",
      ],

      totalFlow: 812000,

      description:
        "Cluster showing rapid movement of funds between multiple elevated-risk accounts.",
    },

    {
      id: "CLUSTER-02",
      name: "Moderate Risk Cluster",
      riskLevel: "MEDIUM",

      members: [
        "ACC-44291",
        "ACC-67102",
      ],

      totalFlow: 72000,

      description:
        "Lower-risk accounts with limited suspicious network activity.",
    },
  ],

  summary: {
    totalNodes: 8,

    totalEdges: 8,

    highRiskNodes: 5,

    criticalNodes: 1,

    suspiciousClusters: 2,

    totalFlow: 1296000,
  },
};

export default mockNetwork;