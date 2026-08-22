/*
|--------------------------------------------------------------------------
| Number Formatting
|--------------------------------------------------------------------------
*/

export const formatNumber = (
  value,
  decimals = 0
) => {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return "0";
  }

  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(number);
};

/*
|--------------------------------------------------------------------------
| Currency Formatting
|--------------------------------------------------------------------------
*/

export const formatCurrency = (
  value,
  compact = false
) => {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return "₹0";
  }

  if (compact) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(number);
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(number);
};

/*
|--------------------------------------------------------------------------
| Compact Amount
|--------------------------------------------------------------------------
*/

export const formatCompactAmount = (value) => {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return "₹0";
  }

  if (number >= 10000000) {
    return `₹${(
      number / 10000000
    ).toFixed(1)}Cr`;
  }

  if (number >= 100000) {
    return `₹${(
      number / 100000
    ).toFixed(1)}L`;
  }

  if (number >= 1000) {
    return `₹${(
      number / 1000
    ).toFixed(1)}K`;
  }

  return `₹${number}`;
};

/*
|--------------------------------------------------------------------------
| Percentage
|--------------------------------------------------------------------------
*/

export const formatPercentage = (
  value,
  decimals = 0
) => {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return "0%";
  }

  return `${number.toFixed(decimals)}%`;
};

/*
|--------------------------------------------------------------------------
| Account Number
|--------------------------------------------------------------------------
*/

export const maskAccountNumber = (
  accountNumber
) => {
  if (!accountNumber) {
    return "XXXX XXXX";
  }

  const value = String(accountNumber);

  if (value.includes("XXXX")) {
    return value;
  }

  const lastFour = value.slice(-4);

  return `XXXX XXXX ${lastFour}`;
};

/*
|--------------------------------------------------------------------------
| Date Formatting
|--------------------------------------------------------------------------
*/

export const formatDate = (
  dateValue
) => {
  if (!dateValue) {
    return "—";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(date);
};

/*
|--------------------------------------------------------------------------
| Date + Time
|--------------------------------------------------------------------------
*/

export const formatDateTime = (
  dateValue
) => {
  if (!dateValue) {
    return "—";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
};

/*
|--------------------------------------------------------------------------
| Relative Time
|--------------------------------------------------------------------------
*/

export const formatRelativeTime = (
  dateValue
) => {
  if (!dateValue) {
    return "—";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  const difference =
    Date.now() - date.getTime();

  const seconds = Math.floor(
    difference / 1000
  );

  if (seconds < 60) {
    return "Just now";
  }

  const minutes = Math.floor(
    seconds / 60
  );

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(
    minutes / 60
  );

  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days = Math.floor(
    hours / 24
  );

  return `${days} day${days !== 1 ? "s" : ""} ago`;
};

/*
|--------------------------------------------------------------------------
| Text Formatting
|--------------------------------------------------------------------------
*/

export const capitalize = (text) => {
  if (!text) {
    return "";
  }

  return (
    text.charAt(0).toUpperCase() +
    text.slice(1).toLowerCase()
  );
};

export const formatStatus = (status) => {
  if (!status) {
    return "—";
  }

  return status
    .toLowerCase()
    .split("_")
    .map(capitalize)
    .join(" ");
};

export const truncateText = (
  text,
  maxLength = 50
) => {
  if (!text) {
    return "";
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(
    0,
    maxLength
  )}...`;
};