"""Transaction endpoints."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Account, Transaction
from ..schemas.transactions import TransactionCreate, TransactionResponse

router = APIRouter(prefix="/api/transactions", tags=["Transactions"])


def _require_account(db: Session, account_id: Optional[int], role: str) -> None:
    """404 rather than a foreign-key error when a counterparty is unknown."""
    if account_id is None:
        return

    exists = (
        db.query(Account.account_id)
        .filter(Account.account_id == account_id)
        .first()
    )

    if exists is None:
        raise HTTPException(
            status_code=404, detail=f"{role} account {account_id} not found"
        )


@router.post(
    "/", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED
)
def create_transaction(payload: TransactionCreate, db: Session = Depends(get_db)):
    """
    Record a transaction.

    Amount, currency, type, channel, status and the sender/receiver/external
    combination are validated by the schema before this runs.
    """
    _require_account(db, payload.sender_account_id, "Sender")
    _require_account(db, payload.receiver_account_id, "Receiver")

    transaction = Transaction(**payload.model_dump())

    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    return transaction


@router.get("/", response_model=list[TransactionResponse])
def list_transactions(
    db: Session = Depends(get_db),
    account_id: Optional[int] = Query(None, description="Either side"),
    transaction_status: Optional[str] = Query(None, alias="status"),
    channel: Optional[str] = None,
    is_flagged: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """List transactions, newest first, with optional filters."""
    query = db.query(Transaction)

    if account_id is not None:
        query = query.filter(
            (Transaction.sender_account_id == account_id)
            | (Transaction.receiver_account_id == account_id)
        )

    if transaction_status:
        query = query.filter(Transaction.status == transaction_status)

    if channel:
        query = query.filter(Transaction.channel == channel)

    if is_flagged is not None:
        query = query.filter(Transaction.is_flagged.is_(is_flagged))

    return (
        query.order_by(Transaction.transaction_timestamp.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(transaction_id: int, db: Session = Depends(get_db)):
    transaction = (
        db.query(Transaction)
        .filter(Transaction.transaction_id == transaction_id)
        .first()
    )

    if transaction is None:
        raise HTTPException(status_code=404, detail="Transaction not found")

    return transaction
