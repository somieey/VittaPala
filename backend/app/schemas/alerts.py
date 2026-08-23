"""Fraud alert request/response models."""
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

AlertType = Literal[
    "mule_account",
    "anomalous_transaction",
    "structuring",
    "rapid_movement",
    "network_pattern",
]
AlertSeverity = Literal["low", "medium", "high", "critical"]

# Matches alert_status_enum in models.py.
AlertStatus = Literal[
    "open",
    "investigating",
    "confirmed_fraud",
    "false_positive",
    "resolved",
]


class FraudAlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    alert_id: int
    account_id: int
    transaction_id: Optional[int]
    risk_score_id: Optional[int]

    alert_type: str
    severity: str
    status: str

    reason: Optional[str]

    created_at: datetime
    resolved_at: Optional[datetime]


class AlertStatusUpdate(BaseModel):
    """Move an alert through its lifecycle."""

    status: AlertStatus
    note: Optional[str] = Field(default=None, max_length=255)
