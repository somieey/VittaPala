from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Account
from ..schemas.accounts import AccountCreate, AccountResponse


router = APIRouter(
    prefix="/api/accounts",
    tags=["Accounts"]
)


@router.post("/", response_model=AccountResponse)
def create_account(
    account: AccountCreate,
    db: Session = Depends(get_db)
):
    new_account = Account(
        account_number=account.account_number,
        account_holder_name=account.account_holder_name,
        account_type=account.account_type,
        ifsc_code=account.ifsc_code,
        bank_name=account.bank_name,
        current_balance=account.current_balance,
        kyc_verified=account.kyc_verified,
        status=account.status,
        date_opened=account.date_opened,
    )

    db.add(new_account)
    db.commit()
    db.refresh(new_account)

    return new_account


@router.get("/{account_id}", response_model=AccountResponse)
def get_account(
    account_id: int,
    db: Session = Depends(get_db)
):
    account = (
        db.query(Account)
        .filter(Account.account_id == account_id)
        .first()
    )

    if not account:
        raise HTTPException(
            status_code=404,
            detail="Account not found"
        )

    return account