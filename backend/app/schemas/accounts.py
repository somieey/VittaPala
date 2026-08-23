"""Account request/response models."""
from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

# Mirrors the SQL enums in models.py. Keeping these as Literals means invalid
# values are rejected by validation with a 422 instead of failing at INSERT.
AccountType = Literal["savings", "current", "wallet"]
AccountStatus = Literal["active", "frozen", "closed", "under_review"]


class AccountCreate(BaseModel):
    account_number: str = Field(min_length=4, max_length=64)
    account_holder_name: str = Field(min_length=1, max_length=255)
    account_type: AccountType
    ifsc_code: Optional[str] = Field(default=None, max_length=11)
    bank_name: Optional[str] = Field(default=None, max_length=100)
    current_balance: Decimal = Field(default=Decimal("0.00"), ge=0)
    kyc_verified: bool = False
    status: AccountStatus = "active"
    date_opened: Optional[date] = None

    @field_validator("ifsc_code")
    @classmethod
    def validate_ifsc(cls, value: Optional[str]) -> Optional[str]:
        """Indian IFSC: 4 letters, a 0, then 6 alphanumerics."""
        if value is None or value == "":
            return None

        candidate = value.strip().upper()

        if len(candidate) != 11 or not candidate[:4].isalpha() or candidate[4] != "0":
            raise ValueError(
                "IFSC must be 11 characters: 4 letters, '0', then 6 alphanumerics"
            )

        if not candidate[5:].isalnum():
            raise ValueError("IFSC suffix must be alphanumeric")

        return candidate

    @field_validator("date_opened")
    @classmethod
    def not_in_future(cls, value: Optional[date]) -> Optional[date]:
        if value and value > date.today():
            raise ValueError("date_opened cannot be in the future")
        return value


class AccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    account_id: int
    account_number: str
    account_holder_name: str
    account_type: str
    ifsc_code: Optional[str]
    bank_name: Optional[str]
    current_balance: Decimal
    kyc_verified: bool
    status: str
    date_opened: Optional[date]
    created_at: Optional[datetime] = None
