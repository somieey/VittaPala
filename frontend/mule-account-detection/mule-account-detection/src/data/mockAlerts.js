const mockAlerts = [
  {
    id: "ALT-10482",

    severity: "CRITICAL",
    type: "MULE",

    title: "Possible Mule Account Detected",

    account: "ACC-10234",

    description:
      "Account shows rapid movement of recently received funds across multiple high-risk counterparties.",

    time: "2 min ago",
    timestamp: "2026-08-22 14:29",

    amount: "₹9.3L",

    status: "OPEN",

    riskScore: 94,
    muleProbability: 92,

    detectionSource: "ML Classification Model",

    reasons: [
      "Rapid movement of received funds",
      "High transaction velocity",
      "Multiple high-risk counterparties",
      "Suspicious network exposure",
    ],

    recommendedAction:
      "Prioritize account investigation and review connected transactions.",
  },

  {
    id: "ALT-10481",

    severity: "HIGH",
    type: "VELOCITY",

    title: "Unusual Transaction Velocity",

    account: "ACC-78124",

    description:
      "Transaction frequency is significantly above the account's historical behavioural baseline.",

    time: "14 min ago",
    timestamp: "2026-08-22 14:17",

    amount: "₹4.8L",

    status: "OPEN",

    riskScore: 86,
    muleProbability: 78,

    detectionSource: "Behavioural Anomaly Model",

    reasons: [
      "Transaction frequency above baseline",
      "Multiple transfers within a short period",
      "Outgoing activity increased significantly",
    ],

    recommendedAction:
      "Review recent transaction velocity and compare with historical behaviour.",
  },

  {
    id: "ALT-10480",

    severity: "HIGH",
    type: "NETWORK",

    title: "High-Risk Network Connection",

    account: "ACC-92817",

    description:
      "Account is connected to multiple entities with elevated fraud risk scores.",

    time: "31 min ago",
    timestamp: "2026-08-22 14:00",

    amount: "₹4.5L",

    status: "INVESTIGATING",

    riskScore: 81,
    muleProbability: 73,

    detectionSource: "Network Risk Engine",

    reasons: [
      "Connected to high-risk account",
      "Multiple suspicious counterparties",
      "Rapid movement between connected accounts",
    ],

    recommendedAction:
      "Investigate the connected account cluster and trace fund movement.",
  },

  {
    id: "ALT-10479",

    severity: "MEDIUM",
    type: "COUNTERPARTY",

    title: "New Counterparty Pattern",

    account: "ACC-44291",

    description:
      "Multiple transactions were initiated with previously unseen counterparties.",

    time: "52 min ago",
    timestamp: "2026-08-22 13:39",

    amount: "₹2.25L",

    status: "OPEN",

    riskScore: 61,
    muleProbability: 48,

    detectionSource: "Transaction Behaviour Model",

    reasons: [
      "New counterparties detected",
      "Transaction pattern differs from baseline",
    ],

    recommendedAction:
      "Review the newly introduced counterparties and transaction purpose.",
  },

  {
    id: "ALT-10478",

    severity: "MEDIUM",
    type: "ANOMALY",

    title: "Amount Deviation Detected",

    account: "ACC-67102",

    description:
      "Transaction amounts differ significantly from the account's normal activity.",

    time: "1 hr ago",
    timestamp: "2026-08-22 13:31",

    amount: "₹2.1L",

    status: "REVIEWED",

    riskScore: 32,
    muleProbability: 12,

    detectionSource: "Anomaly Detection Model",

    reasons: [
      "Transaction amount outside normal range",
      "Behavioural deviation detected",
    ],

    recommendedAction:
      "Monitor future activity and verify whether the deviation persists.",
  },

  {
    id: "ALT-10477",

    severity: "CRITICAL",
    type: "NETWORK",

    title: "Suspicious Fund Flow Chain",

    account: "ACC-10234",

    description:
      "Funds appear to move through multiple accounts within a short time window.",

    time: "1 hr ago",
    timestamp: "2026-08-22 13:12",

    amount: "₹6.8L",

    status: "INVESTIGATING",

    riskScore: 96,
    muleProbability: 95,

    detectionSource: "Graph Intelligence Engine",

    reasons: [
      "Multi-hop fund movement",
      "Short transaction intervals",
      "High-risk intermediary accounts",
      "Circular network behaviour",
    ],

    recommendedAction:
      "Trace the complete transaction chain and investigate intermediary accounts.",
  },
];

export default mockAlerts;