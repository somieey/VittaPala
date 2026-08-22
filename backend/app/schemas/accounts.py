from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class AccountCreate(BaseModel):
    account_number: str
    account_holder_name: str
    account_type: str
    ifsc_code: str
    bank_name: str
    current_balance: Decimal = Decimal("0.00")
    kyc_verified: bool = False
    status: str = "ACTIVE"
    date_opened: date


class AccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    account_id: int
    account_number: str
    account_holder_name: str
    account_type: str
    ifsc_code: str
    bank_name: str
    current_balance: Decimal
    kyc_verified: bool
    status: str
    date_opened: date