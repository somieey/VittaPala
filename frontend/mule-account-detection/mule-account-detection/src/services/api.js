import mockAccounts from "../data/mockAccounts";
import mockTransactions from "../data/mockTransactions";
import mockAlerts from "../data/mockAlerts";
import mockNetwork from "../data/mockNetwork";

// Change this later when your backend is ready.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || null;

/*
|--------------------------------------------------------------------------
| Helper
|--------------------------------------------------------------------------
*/

const delay = (ms = 300) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const request = async (endpoint, options = {}) => {
  if (!API_BASE_URL) {
    return null;
  }

  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    }
  );

  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status}`
    );
  }

  return response.json();
};

/*
|--------------------------------------------------------------------------
| Account APIs
|--------------------------------------------------------------------------
*/

export const getAccounts = async () => {
  if (!API_BASE_URL) {
    await delay();
    return mockAccounts;
  }

  return request("/accounts/");
};

export const getAccountById = async (accountId) => {
  if (!API_BASE_URL) {
    await delay();

    return (
      mockAccounts.find(
        (account) => account.id === accountId
      ) || null
    );
  }

  return request(`/accounts/${accountId}`);
};

export const searchAccounts = async (query) => {
  if (!API_BASE_URL) {
    await delay(200);

    const normalizedQuery = query
      .toLowerCase()
      .trim();

    if (!normalizedQuery) {
      return mockAccounts;
    }

    return mockAccounts.filter(
      (account) =>
        account.id
          .toLowerCase()
          .includes(normalizedQuery) ||
        account.name
          .toLowerCase()
          .includes(normalizedQuery) ||
        account.accountNumber
          .toLowerCase()
          .includes(normalizedQuery)
    );
  }

  return request(
    `/accounts/?q=${encodeURIComponent(query)}`
  );
};

/*
|--------------------------------------------------------------------------
| Transaction APIs
|--------------------------------------------------------------------------
*/

export const getTransactions = async (accountId) => {
  if (!API_BASE_URL) {
    await delay();

    if (!accountId) {
      return mockTransactions;
    }

    return mockTransactions.filter(
      (transaction) =>
        transaction.accountId === accountId
    );
  }

  const endpoint = accountId
    ? `/transactions/?account_id=${encodeURIComponent(accountId)}`
    : "/transactions/";

  return request(endpoint);
};

export const getTransactionById = async (
  transactionId
) => {
  if (!API_BASE_URL) {
    await delay();

    return (
      mockTransactions.find(
        (transaction) =>
          transaction.id === transactionId
      ) || null
    );
  }

  return request(`/transactions/${transactionId}`);
};

/*
|--------------------------------------------------------------------------
| Risk / ML APIs
|--------------------------------------------------------------------------
*/

export const getRiskScore = async (accountId) => {
  if (!API_BASE_URL) {
    await delay(400);

    const account = mockAccounts.find(
      (item) => item.id === accountId
    );

    if (!account) {
      return null;
    }

    return {
      accountId: account.id,
      riskScore: account.riskScore,
      riskLevel: account.riskLevel,
      muleProbability: account.muleProbability,
      signals: account.riskSignals,
    };
  }

  // The backend exposes the latest score through the investigation view.
  return request(
    `/accounts/${encodeURIComponent(accountId)}/investigation`
  );
};

export const investigateAccount = async (
  accountId
) => {
  if (!API_BASE_URL) {
    await delay(500);

    const account = mockAccounts.find(
      (item) => item.id === accountId
    );

    if (!account) {
      return null;
    }

    const transactions = mockTransactions.filter(
      (transaction) =>
        transaction.accountId === accountId
    );

    return {
      account,
      transactions,

      risk: {
        score: account.riskScore,
        level: account.riskLevel,
        muleProbability: account.muleProbability,
        signals: account.riskSignals,
      },
    };
  }

  return request(
    `/accounts/${encodeURIComponent(accountId)}/investigation`
  );
};

/*
|--------------------------------------------------------------------------
| Fraud Detection / Loophole Engine
|--------------------------------------------------------------------------
*/

/**
 * Run the backend rule-based loophole engine for one transaction.
 *
 * POST /risk/analyze/{transaction_id}
 *
 * Returns the engine's RiskAnalysisResponse: risk_score (0-100),
 * mule_probability (0-1), risk_level, detected_patterns and explanation.
 *
 * Returns null when no API base URL is configured, so callers keep their
 * existing fallback display instead of showing invented risk data.
 */
export const analyzeTransaction = async (transactionId) => {
  if (!API_BASE_URL) {
    return null;
  }

  return request(
    `/risk/analyze/${encodeURIComponent(transactionId)}`,
    { method: "POST" }
  );
};

/*
|--------------------------------------------------------------------------
| Alert APIs
|--------------------------------------------------------------------------
*/

export const getAlerts = async (filters = {}) => {
  if (!API_BASE_URL) {
    await delay();

    let results = [...mockAlerts];

    if (
      filters.severity &&
      filters.severity !== "ALL"
    ) {
      results = results.filter(
        (alert) =>
          alert.severity === filters.severity
      );
    }

    if (
      filters.status &&
      filters.status !== "ALL"
    ) {
      results = results.filter(
        (alert) =>
          alert.status === filters.status
      );
    }

    if (
      filters.type &&
      filters.type !== "ALL"
    ) {
      results = results.filter(
        (alert) =>
          alert.type === filters.type
      );
    }

    return results;
  }

  const params = new URLSearchParams();

  if (filters.severity && filters.severity !== "ALL") {
    params.append("severity", filters.severity);
  }

  if (filters.status && filters.status !== "ALL") {
    params.append("status", filters.status);
  }

  if (filters.type && filters.type !== "ALL") {
    params.append("alert_type", String(filters.type).toLowerCase());
  }

  if (filters.accountId) {
    params.append("account_id", filters.accountId);
  }

  const query = params.toString();

  return request(`/alerts/${query ? `?${query}` : ""}`);
};

export const getAlertById = async (alertId) => {
  if (!API_BASE_URL) {
    await delay();

    return (
      mockAlerts.find(
        (alert) => alert.id === alertId
      ) || null
    );
  }

  return request(`/alerts/${alertId}`);
};

/**
 * Move an alert through its lifecycle. PATCH /alerts/{id}/status
 */
export const updateAlertStatus = async (alertId, status, note) => {
  if (!API_BASE_URL) {
    return null;
  }

  return request(`/alerts/${encodeURIComponent(alertId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status, note }),
  });
};

/**
 * Transactions belonging to one account.
 */
export const getAccountTransactions = async (accountId) => {
  if (!API_BASE_URL) {
    await delay();
    return mockTransactions.filter((t) => t.accountId === accountId);
  }

  return request(`/accounts/${encodeURIComponent(accountId)}/transactions`);
};

/**
 * Create a transaction. POST /transactions/
 */
export const createTransaction = async (payload) => {
  if (!API_BASE_URL) {
    return null;
  }

  return request("/transactions/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

/*
|--------------------------------------------------------------------------
| Network APIs
|--------------------------------------------------------------------------
*/

export const getNetwork = async (accountId) => {
  if (!API_BASE_URL) {
    await delay(400);

    if (!accountId) {
      return mockNetwork;
    }

    const relatedNodeIds = new Set([accountId]);

    mockNetwork.edges.forEach((edge) => {
      if (edge.source === accountId) {
        relatedNodeIds.add(edge.target);
      }

      if (edge.target === accountId) {
        relatedNodeIds.add(edge.source);
      }
    });

    return {
      ...mockNetwork,

      nodes: mockNetwork.nodes.filter((node) =>
        relatedNodeIds.has(node.id)
      ),

      edges: mockNetwork.edges.filter(
        (edge) =>
          relatedNodeIds.has(edge.source) &&
          relatedNodeIds.has(edge.target)
      ),
    };
  }

  const endpoint = accountId
    ? `/network/${encodeURIComponent(accountId)}`
    : "/network";

  return request(endpoint);
};

/*
|--------------------------------------------------------------------------
| AI Investigator API
|--------------------------------------------------------------------------
*/

export const askAIInvestigator = async ({
  question,
  accountId,
  conversation = [],
}) => {
  if (!API_BASE_URL) {
    await delay(700);

    const questionText =
      question.toLowerCase();

    let response =
      "Based on the available transaction intelligence, the account shows several behavioural and transactional patterns that require further investigation.";

    if (
      questionText.includes("why") ||
      questionText.includes("flag")
    ) {
      response =
        "The account was flagged because multiple behavioural signals are elevated, including rapid fund movement, unusual transaction velocity, and high-risk network connections.";
    }

    if (
      questionText.includes("risk") ||
      questionText.includes("signal")
    ) {
      response =
        "The strongest risk signals are rapid movement of received funds, elevated transaction velocity, and connections to multiple high-risk accounts.";
    }

    if (
      questionText.includes("network") ||
      questionText.includes("connect")
    ) {
      response =
        "The account is connected to several entities. Multiple connected accounts have elevated risk scores, making the network structure important for investigation.";
    }

    if (
      questionText.includes("money") ||
      questionText.includes("flow")
    ) {
      response =
        "The observed pattern shows incoming funds being received from multiple counterparties and then rapidly distributed to other accounts. This pass-through behaviour is a significant risk indicator.";
    }

    return {
      answer: response,

      accountId: accountId || null,

      riskScore: accountId
        ? mockAccounts.find(
            (account) => account.id === accountId
          )?.riskScore || null
        : null,

      evidence: [
        "Transaction behaviour analysis",
        "Counterparty risk analysis",
        "Network relationship analysis",
      ],
    };
  }

  return request("/ai/investigate", {
    method: "POST",

    body: JSON.stringify({
      question,
      accountId,
      conversation,
    }),
  });
};

/*
|--------------------------------------------------------------------------
| Dashboard APIs
|--------------------------------------------------------------------------
*/

export const getDashboardData = async () => {
  if (!API_BASE_URL) {
    await delay();

    const criticalAccounts =
      mockAccounts.filter(
        (account) =>
          account.riskLevel === "CRITICAL"
      ).length;

    const highRiskAccounts =
      mockAccounts.filter(
        (account) =>
          account.riskLevel === "HIGH"
      ).length;

    const openAlerts =
      mockAlerts.filter(
        (alert) => alert.status === "OPEN"
      ).length;

    return {
      totalAccounts: mockAccounts.length,

      criticalAccounts,

      highRiskAccounts,

      openAlerts,

      totalTransactions:
        mockTransactions.length,

      suspiciousTransactions:
        mockTransactions.filter(
          (transaction) =>
            transaction.riskScore >= 70
        ).length,

      networkNodes:
        mockNetwork.nodes.length,

      networkEdges:
        mockNetwork.edges.length,
    };
  }

  return request("/dashboard/stats");
};

export default {
  getAccounts,
  getAccountById,
  searchAccounts,

  getTransactions,
  getTransactionById,

  getRiskScore,
  investigateAccount,
  analyzeTransaction,

  getAlerts,
  getAlertById,
  updateAlertStatus,

  getAccountTransactions,
  createTransaction,

  getNetwork,

  askAIInvestigator,

  getDashboardData,
};