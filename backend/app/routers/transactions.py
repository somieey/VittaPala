from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Transaction, Account
from ..schemas.transactions import (
    TransactionCreate,
    TransactionResponse,
)


router = APIRouter(
    prefix="/api/transactions",
    tags=["Transactions"]
)


@router.post("/", response_model=TransactionResponse)
def create_transaction(
    transaction: TransactionCreate,
    db: Session = Depends(get_db)
):
    # Check sender account if provided
    if transaction.sender_account_id is not None:
        sender = (
            db.query(Account)
            .filter(Account.account_id == transaction.sender_account_id)
            .first()
        )

        if not sender:
            raise HTTPException(
                status_code=404,
                detail="Sender account not found"
            )

    # Check receiver account if provided
    if transaction.receiver_account_id is not None:
        receiver = (
            db.query(Account)
            .filter(Account.account_id == transaction.receiver_account_id)
            .first()
        )

        if not receiver:
            raise HTTPException(
                status_code=404,
                detail="Receiver account not found"
            )

    new_transaction = Transaction(
        sender_account_id=transaction.sender_account_id,
        receiver_account_id=transaction.receiver_account_id,
        external_account_ref=transaction.external_account_ref,

        amount=transaction.amount,
        currency=transaction.currency,
        transaction_type=transaction.transaction_type,
        channel=transaction.channel,
        status=transaction.status,

        transaction_timestamp=transaction.transaction_timestamp,

        description=transaction.description,
        device_id=transaction.device_id,
        device_fingerprint=transaction.device_fingerprint,
        ip_address=transaction.ip_address,
        location=transaction.location,
        merchant_category=transaction.merchant_category,
    )

    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)

    return new_transaction


@router.get(
    "/{transaction_id}",
    response_model=TransactionResponse
)
def get_transaction(
    transaction_id: int,
    db: Session = Depends(get_db)
):
    transaction = (
        db.query(Transaction)
        .filter(Transaction.transaction_id == transaction_id)
        .first()
    )

    if not transaction:
        raise HTTPException(
            status_code=404,
            detail="Transaction not found"
        )

    return transaction