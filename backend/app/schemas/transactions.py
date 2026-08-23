"""Transaction request/response models."""
from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

TransactionType = Literal["transfer", "deposit", "withdrawal", "payment"]
TransactionChannel = Literal["UPI", "NEFT", "IMPS", "RTGS", "card", "atm", "cash"]
TransactionStatus = Literal["completed", "pending", "failed", "reversed"]


class TransactionCreate(BaseModel):
    sender_account_id: Optional[int] = None
    receiver_account_id: Optional[int] = None
    external_account_ref: Optional[str] = Field(default=None, max_length=64)

    # gt=0 rejects both zero and negative amounts at validation time.
    amount: Decimal = Field(gt=0, max_digits=15, decimal_places=2)
    currency: str = Field(default="INR", min_length=3, max_length=3)
    transaction_type: TransactionType
    channel: Optional[TransactionChannel] = None
    status: TransactionStatus = "completed"

    transaction_timestamp: datetime

    description: Optional[str] = Field(default=None, max_length=255)
    device_id: Optional[str] = Field(default=None, max_length=128)
    device_fingerprint: Optional[str] = Field(default=None, max_length=255)
    ip_address: Optional[str] = Field(default=None, max_length=45)
    location: Optional[str] = Field(default=None, max_length=100)
    merchant_category: Optional[str] = Field(default=None, max_length=100)

    @model_validator(mode="after")
    def check_counterparties(self) -> "TransactionCreate":
        """
        Money has to come from somewhere and go somewhere.

        At least one internal account must be involved, the two sides cannot
        be the same account, and a one-sided transaction needs an external
        reference to say where the other side was.
        """
        if self.sender_account_id is None and self.receiver_account_id is None:
            raise ValueError(
                "A transaction needs a sender_account_id, a "
                "receiver_account_id, or both"
            )

        if (
            self.sender_account_id is not None
            and self.sender_account_id == self.receiver_account_id
        ):
            raise ValueError("sender_account_id and receiver_account_id must differ")

        one_sided = (
            self.sender_account_id is None or self.receiver_account_id is None
        )

        if one_sided and not self.external_account_ref:
            raise ValueError(
                "external_account_ref is required when only one side of the "
                "transaction is an internal account"
            )

        return self


class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    transaction_id: int

    sender_account_id: Optional[int]
    receiver_account_id: Optional[int]
    external_account_ref: Optional[str]

    amount: Decimal
    currency: str
    transaction_type: str
    channel: Optional[str]
    status: str

    transaction_timestamp: datetime

    description: Optional[str]
    device_id: Optional[str]
    device_fingerprint: Optional[str]
    ip_address: Optional[str]
    location: Optional[str]
    merchant_category: Optional[str]

    anomaly_score: Optional[Decimal]
    is_flagged: bool
