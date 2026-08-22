from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class TransactionCreate(BaseModel):
    sender_account_id: int | None = None
    receiver_account_id: int | None = None
    external_account_ref: str | None = None

    amount: Decimal
    currency: str = "INR"
    transaction_type: str
    channel: str
    status: str = "COMPLETED"

    transaction_timestamp: datetime

    description: str | None = None
    device_id: str | None = None
    device_fingerprint: str | None = None
    ip_address: str | None = None
    location: str | None = None
    merchant_category: str | None = None


class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    transaction_id: int

    sender_account_id: int | None
    receiver_account_id: int | None
    external_account_ref: str | None

    amount: Decimal
    currency: str
    transaction_type: str
    channel: str
    status: str

    transaction_timestamp: datetime

    description: str | None
    device_id: str | None
    device_fingerprint: str | None
    ip_address: str | None
    location: str | None
    merchant_category: str | None

    anomaly_score: float | None
    is_flagged: bool