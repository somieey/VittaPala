/*
|--------------------------------------------------------------------------
| Risk Utilities
|--------------------------------------------------------------------------
*/

export const getRiskLevel = (score) => {
  const numericScore = Number(score) || 0;

  if (numericScore >= 90) {
    return "CRITICAL";
  }

  if (numericScore >= 70) {
    return "HIGH";
  }

  if (numericScore >= 40) {
    return "MEDIUM";
  }

  return "LOW";
};

export const getRiskLabel = (score) => {
  return getRiskLevel(score);
};

export const getRiskDescription = (score) => {
  const level = getRiskLevel(score);

  const descriptions = {
    CRITICAL:
      "Immediate investigation recommended. Multiple strong risk indicators detected.",

    HIGH:
      "High-risk behaviour detected. Further investigation is recommended.",

    MEDIUM:
      "Moderate risk detected. Account activity should be monitored.",

    LOW:
      "No significant risk indicators detected.",
  };

  return descriptions[level];
};

export const getRiskPercentage = (score) => {
  const numericScore = Number(score) || 0;

  return Math.min(
    100,
    Math.max(0, numericScore)
  );
};

export const getRiskColorClass = (score) => {
  const level = getRiskLevel(score);

  const colors = {
    CRITICAL: "text-red-400",
    HIGH: "text-orange-400",
    MEDIUM: "text-yellow-400",
    LOW: "text-emerald-400",
  };

  return colors[level];
};

export const getRiskBackgroundClass = (score) => {
  const level = getRiskLevel(score);

  const backgrounds = {
    CRITICAL:
      "bg-red-400/10 border-red-400/20",

    HIGH:
      "bg-orange-400/10 border-orange-400/20",

    MEDIUM:
      "bg-yellow-400/10 border-yellow-400/20",

    LOW:
      "bg-emerald-400/10 border-emerald-400/20",
  };

  return backgrounds[level];
};

export const getRiskDotClass = (score) => {
  const level = getRiskLevel(score);

  const colors = {
    CRITICAL: "bg-red-400",
    HIGH: "bg-orange-400",
    MEDIUM: "bg-yellow-400",
    LOW: "bg-emerald-400",
  };

  return colors[level];
};

export const getMuleProbabilityLabel = (
  probability
) => {
  const value = Number(probability) || 0;

  if (value >= 90) {
    return "Very High";
  }

  if (value >= 70) {
    return "High";
  }

  if (value >= 40) {
    return "Moderate";
  }

  return "Low";
};

export const isHighRisk = (score) => {
  return Number(score) >= 70;
};

export const isCriticalRisk = (score) => {
  return Number(score) >= 90;
};

export const getRiskSignalsCount = (
  signals = []
) => {
  return Array.isArray(signals)
    ? signals.length
    : 0;
};

export const calculateAverageRisk = (
  accounts = []
) => {
  if (!accounts.length) {
    return 0;
  }

  const total = accounts.reduce(
    (sum, account) =>
      sum + (Number(account.riskScore) || 0),
    0
  );

  return Math.round(total / accounts.length);
};