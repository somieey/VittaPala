const mockAccounts = [
  {
    id: "ACC-10234",
    name: "Account 10234",
    accountNumber: "XXXX XXXX 10234",

    riskScore: 94,
    riskLevel: "CRITICAL",
    muleProbability: 92,

    accountStatus: "ACTIVE",
    kycStatus: "VERIFIED",

    accountType: "SAVINGS",
    customerType: "INDIVIDUAL",

    location: "Indore, MP",
    createdAt: "2024-03-18",

    totalIncoming: 1085000,
    totalOutgoing: 932000,

    transactionCount: 87,

    incomingTransactions: 42,
    outgoingTransactions: 45,

    uniqueCounterparties: 17,

    highRiskConnections: 5,

    avgTransactionAmount: 12471,

    riskSignals: [
      "Rapid movement of received funds",
      "Unusual transaction velocity",
      "Multiple high-risk counterparties",
      "High network exposure",
    ],

    behaviour: {
      transactionVelocity: "HIGH",
      fundMovement: "RAPID",
      counterpartyDiversity: "HIGH",
      nightActivity: "ELEVATED",
    },

    lastTransaction: "2026-08-22 14:18",
  },

  {
    id: "ACC-78124",
    name: "Account 78124",
    accountNumber: "XXXX XXXX 78124",

    riskScore: 86,
    riskLevel: "HIGH",
    muleProbability: 78,

    accountStatus: "ACTIVE",
    kycStatus: "VERIFIED",

    accountType: "CURRENT",
    customerType: "INDIVIDUAL",

    location: "Bhopal, MP",
    createdAt: "2023-11-09",

    totalIncoming: 682000,
    totalOutgoing: 541000,

    transactionCount: 64,

    incomingTransactions: 31,
    outgoingTransactions: 33,

    uniqueCounterparties: 11,

    highRiskConnections: 3,

    avgTransactionAmount: 10656,

    riskSignals: [
      "Transaction velocity above baseline",
      "Frequent fund transfers",
      "New counterparties detected",
    ],

    behaviour: {
      transactionVelocity: "HIGH",
      fundMovement: "FAST",
      counterpartyDiversity: "MEDIUM",
      nightActivity: "NORMAL",
    },

    lastTransaction: "2026-08-22 13:52",
  },

  {
    id: "ACC-92817",
    name: "Account 92817",
    accountNumber: "XXXX XXXX 92817",

    riskScore: 81,
    riskLevel: "HIGH",
    muleProbability: 73,

    accountStatus: "ACTIVE",
    kycStatus: "VERIFIED",

    accountType: "SAVINGS",
    customerType: "INDIVIDUAL",

    location: "Mumbai, MH",
    createdAt: "2025-01-22",

    totalIncoming: 475000,
    totalOutgoing: 429000,

    transactionCount: 51,

    incomingTransactions: 26,
    outgoingTransactions: 25,

    uniqueCounterparties: 9,

    highRiskConnections: 4,

    avgTransactionAmount: 9314,

    riskSignals: [
      "Connected to high-risk accounts",
      "Unusual outgoing transaction pattern",
      "Rapid fund distribution",
    ],

    behaviour: {
      transactionVelocity: "MEDIUM",
      fundMovement: "RAPID",
      counterpartyDiversity: "HIGH",
      nightActivity: "ELEVATED",
    },

    lastTransaction: "2026-08-22 12:47",
  },

  {
    id: "ACC-44291",
    name: "Account 44291",
    accountNumber: "XXXX XXXX 44291",

    riskScore: 61,
    riskLevel: "MEDIUM",
    muleProbability: 48,

    accountStatus: "ACTIVE",
    kycStatus: "VERIFIED",

    accountType: "SAVINGS",
    customerType: "INDIVIDUAL",

    location: "Pune, MH",
    createdAt: "2022-07-14",

    totalIncoming: 318000,
    totalOutgoing: 271000,

    transactionCount: 39,

    incomingTransactions: 20,
    outgoingTransactions: 19,

    uniqueCounterparties: 7,

    highRiskConnections: 2,

    avgTransactionAmount: 8153,

    riskSignals: [
      "New counterparty activity",
      "Moderate transaction deviation",
    ],

    behaviour: {
      transactionVelocity: "MEDIUM",
      fundMovement: "NORMAL",
      counterpartyDiversity: "MEDIUM",
      nightActivity: "NORMAL",
    },

    lastTransaction: "2026-08-22 11:35",
  },

  {
    id: "ACC-67102",
    name: "Account 67102",
    accountNumber: "XXXX XXXX 67102",

    riskScore: 32,
    riskLevel: "LOW",
    muleProbability: 12,

    accountStatus: "ACTIVE",
    kycStatus: "VERIFIED",

    accountType: "SAVINGS",
    customerType: "INDIVIDUAL",

    location: "Indore, MP",
    createdAt: "2021-09-28",

    totalIncoming: 156000,
    totalOutgoing: 129000,

    transactionCount: 23,

    incomingTransactions: 12,
    outgoingTransactions: 11,

    uniqueCounterparties: 5,

    highRiskConnections: 0,

    avgTransactionAmount: 6782,

    riskSignals: [
      "No significant anomalies detected",
    ],

    behaviour: {
      transactionVelocity: "LOW",
      fundMovement: "NORMAL",
      counterpartyDiversity: "LOW",
      nightActivity: "NORMAL",
    },

    lastTransaction: "2026-08-21 17:42",
  },
];

export default mockAccounts;