from abc import ABC, abstractmethod
from datetime import date, datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, Field


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# =========================
# INPUT
# =========================

class TransactionData(BaseModel):
    transaction_id: int
    amount: Decimal
    channel: str | None = None
    transaction_timestamp: datetime
    device_fingerprint: str | None = None

    sender_account_id: int | None = None
    receiver_account_id: int | None = None

    device_id: str | None = None
    ip_address: str | None = None
    location: str | None = None

    transaction_type: str | None = None
    status: str | None = None
    merchant_category: str | None = None

    sender_account_id: int | None = None
    receiver_account_id: int | None = None


class AccountData(BaseModel):
    account_id: int
    kyc_verified: bool
    date_opened: date | None = None


class RiskContext(BaseModel):
    transaction: TransactionData
    account: AccountData

    recent_transactions: list[TransactionData] = Field(
        default_factory=list
    )

    related_data: dict = Field(
        default_factory=dict
    )


# =========================
# OUTPUT
# =========================

class DetectedPattern(BaseModel):
    code: str
    description: str
    severity: RiskLevel

    # ---- Explainability -------------------------------------------------
    # All optional with defaults, so any engine or caller written against
    # the original three-field shape keeps working unchanged.

    # Stable identifier of the rule that fired. Mirrors `code`; kept as a
    # separate field because downstream consumers ask for `rule_id`.
    rule_id: str | None = None

    # Human-readable rule name, e.g. "Rapid movement of funds".
    rule_name: str | None = None

    # Points this rule contributed before cross-rule discounting.
    score_contribution: float | None = None

    # 0..1 — how much evidence backed this finding, not how bad it is.
    confidence: float | None = None

    # The account the finding is about.
    account_id: int | None = None

    # Transactions that constitute the evidence for this finding.
    transaction_ids: list[int] = Field(default_factory=list)

    # Raw supporting metrics (counts, ratios, windows).
    evidence: dict = Field(default_factory=dict)


class RiskResult(BaseModel):
    anomaly_score: float | None = None
    risk_score: float
    mule_probability: float
    risk_level: RiskLevel

    explanation: dict = Field(
        default_factory=dict
    )

    detected_patterns: list[DetectedPattern] = Field(
        default_factory=list
    )

    model_version: str


# =========================
# RISK ENGINE CONTRACT
# =========================

class RiskEngine(ABC):

    @abstractmethod
    def analyze(self, context: RiskContext) -> RiskResult:
        """
        Analyze a transaction/account context and return
        a standardized risk result.
        """
        pass