"""Account management endpoints."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Account, FraudAlert, Transaction
from ..schemas.accounts import AccountCreate, AccountResponse
from ..schemas.alerts import FraudAlertResponse
from ..schemas.transactions import TransactionResponse
from ..services.investigation import build_investigation

router = APIRouter(prefix="/api/accounts", tags=["Accounts"])


def _get_account_or_404(db: Session, account_id: int) -> Account:
    account = (
        db.query(Account).filter(Account.account_id == account_id).first()
    )

    if account is None:
        raise HTTPException(status_code=404, detail="Account not found")

    return account


@router.post("/", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
def create_account(payload: AccountCreate, db: Session = Depends(get_db)):
    """Create a bank account."""
    duplicate = (
        db.query(Account)
        .filter(Account.account_number == payload.account_number)
        .first()
    )

    if duplicate is not None:
        raise HTTPException(
            status_code=409,
            detail="An account with this account_number already exists",
        )

    account = Account(**payload.model_dump())

    db.add(account)
    db.commit()
    db.refresh(account)

    return account


@router.get("/", response_model=list[AccountResponse])
def list_accounts(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None, description="Search number or holder name"),
    account_status: Optional[str] = Query(None, alias="status"),
    kyc_verified: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """List accounts, newest first, with optional search and filters."""
    query = db.query(Account)

    if q:
        pattern = f"%{q}%"
        query = query.filter(
            Account.account_number.like(pattern)
            | Account.account_holder_name.like(pattern)
        )

    if account_status:
        query = query.filter(Account.status == account_status)

    if kyc_verified is not None:
        query = query.filter(Account.kyc_verified.is_(kyc_verified))

    return (
        query.order_by(Account.account_id.desc()).offset(offset).limit(limit).all()
    )


@router.get("/{account_id}", response_model=AccountResponse)
def get_account(account_id: int, db: Session = Depends(get_db)):
    return _get_account_or_404(db, account_id)


@router.get("/{account_id}/transactions", response_model=list[TransactionResponse])
def get_account_transactions(
    account_id: int,
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Transaction history for one account, in either direction."""
    _get_account_or_404(db, account_id)

    return (
        db.query(Transaction)
        .filter(
            (Transaction.sender_account_id == account_id)
            | (Transaction.receiver_account_id == account_id)
        )
        .order_by(Transaction.transaction_timestamp.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.get("/{account_id}/alerts", response_model=list[FraudAlertResponse])
def get_account_alerts(account_id: int, db: Session = Depends(get_db)):
    """Every alert raised against one account."""
    _get_account_or_404(db, account_id)

    return (
        db.query(FraudAlert)
        .filter(FraudAlert.account_id == account_id)
        .order_by(FraudAlert.created_at.desc())
        .all()
    )


@router.get("/{account_id}/investigation")
def get_account_investigation(account_id: int, db: Session = Depends(get_db)):
    """
    Full investigation view: account, statistics, risk history, alerts,
    devices, locations, counterparties, mule indicators and a summary.
    """
    account = _get_account_or_404(db, account_id)

    return build_investigation(db, account)
