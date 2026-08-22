const mockTransactions = [
  {
    id: "TXN-90001",
    accountId: "ACC-10234",

    type: "CREDIT",
    amount: 185000,

    counterparty: "ACC-55120",
    counterpartyName: "Unknown Entity",

    timestamp: "2026-08-22 09:12",

    channel: "UPI",
    status: "COMPLETED",

    location: "Indore, MP",

    riskScore: 91,
    riskLevel: "CRITICAL",

    flags: [
      "High amount",
      "New counterparty",
      "Rapid fund movement",
    ],
  },

  {
    id: "TXN-90002",
    accountId: "ACC-10234",

    type: "DEBIT",
    amount: 172000,

    counterparty: "ACC-67102",
    counterpartyName: "Account 67102",

    timestamp: "2026-08-22 09:28",

    channel: "IMPS",
    status: "COMPLETED",

    location: "Indore, MP",

    riskScore: 88,
    riskLevel: "HIGH",

    flags: [
      "Rapid outgoing transfer",
      "Short time after credit",
    ],
  },

  {
    id: "TXN-90003",
    accountId: "ACC-10234",

    type: "CREDIT",
    amount: 245000,

    counterparty: "ACC-88321",
    counterpartyName: "Unknown Entity",

    timestamp: "2026-08-22 10:14",

    channel: "NEFT",
    status: "COMPLETED",

    location: "Bhopal, MP",

    riskScore: 84,
    riskLevel: "HIGH",

    flags: [
      "Large incoming amount",
      "New counterparty",
    ],
  },

  {
    id: "TXN-90004",
    accountId: "ACC-10234",

    type: "DEBIT",
    amount: 228000,

    counterparty: "ACC-92817",
    counterpartyName: "Account 92817",

    timestamp: "2026-08-22 10:31",

    channel: "IMPS",
    status: "COMPLETED",

    location: "Mumbai, MH",

    riskScore: 93,
    riskLevel: "CRITICAL",

    flags: [
      "Rapid fund transfer",
      "High-risk counterparty",
      "Network connection",
    ],
  },

  {
    id: "TXN-90005",
    accountId: "ACC-78124",

    type: "CREDIT",
    amount: 95000,

    counterparty: "ACC-33871",
    counterpartyName: "Unknown Entity",

    timestamp: "2026-08-22 11:03",

    channel: "UPI",
    status: "COMPLETED",

    location: "Bhopal, MP",

    riskScore: 72,
    riskLevel: "HIGH",

    flags: [
      "Unusual amount",
      "New counterparty",
    ],
  },

  {
    id: "TXN-90006",
    accountId: "ACC-78124",

    type: "DEBIT",
    amount: 87000,

    counterparty: "ACC-92817",
    counterpartyName: "Account 92817",

    timestamp: "2026-08-22 11:18",

    channel: "UPI",
    status: "COMPLETED",

    location: "Bhopal, MP",

    riskScore: 79,
    riskLevel: "HIGH",

    flags: [
      "Fast fund movement",
      "High-risk network",
    ],
  },

  {
    id: "TXN-90007",
    accountId: "ACC-92817",

    type: "CREDIT",
    amount: 142000,

    counterparty: "ACC-10234",
    counterpartyName: "Account 10234",

    timestamp: "2026-08-22 11:47",

    channel: "IMPS",
    status: "COMPLETED",

    location: "Mumbai, MH",

    riskScore: 83,
    riskLevel: "HIGH",

    flags: [
      "High-risk source",
      "Network relationship",
    ],
  },

  {
    id: "TXN-90008",
    accountId: "ACC-92817",

    type: "DEBIT",
    amount: 138000,

    counterparty: "ACC-44901",
    counterpartyName: "Unknown Entity",

    timestamp: "2026-08-22 12:02",

    channel: "NEFT",
    status: "COMPLETED",

    location: "Mumbai, MH",

    riskScore: 89,
    riskLevel: "HIGH",

    flags: [
      "Rapid fund distribution",
      "New destination",
    ],
  },

  {
    id: "TXN-90009",
    accountId: "ACC-44291",

    type: "CREDIT",
    amount: 72000,

    counterparty: "ACC-55281",
    counterpartyName: "Unknown Entity",

    timestamp: "2026-08-22 10:45",

    channel: "UPI",
    status: "COMPLETED",

    location: "Pune, MH",

    riskScore: 57,
    riskLevel: "MEDIUM",

    flags: [
      "New counterparty",
    ],
  },

  {
    id: "TXN-90010",
    accountId: "ACC-67102",

    type: "DEBIT",
    amount: 12500,

    counterparty: "MERCHANT-2187",
    counterpartyName: "Retail Merchant",

    timestamp: "2026-08-21 17:42",

    channel: "CARD",
    status: "COMPLETED",

    location: "Indore, MP",

    riskScore: 18,
    riskLevel: "LOW",

    flags: [],
  },
];

export default mockTransactions;