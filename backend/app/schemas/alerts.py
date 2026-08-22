from datetime import datetime

from pydantic import BaseModel, ConfigDict


class FraudAlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    alert_id: int
    account_id: int
    transaction_id: int | None
    risk_score_id: int | None

    alert_type: str
    severity: str
    status: str

    reason: str | None

    created_at: datetime
    resolved_at: datetime | None