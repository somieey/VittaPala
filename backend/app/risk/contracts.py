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