from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Account, RiskScore, FraudAlert, Transaction
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


@router.get("/{account_id}/investigation")
def get_account_investigation(
    account_id: int,
    db: Session = Depends(get_db),
):
    account = (
        db.query(Account)
        .filter(Account.account_id == account_id)
        .first()
    )

    if not account:
        raise HTTPException(
            status_code=404,
            detail="Account not found",
        )

    risk_score = (
        db.query(RiskScore)
        .filter(RiskScore.account_id == account_id)
        .order_by(RiskScore.scored_at.desc())
        .first()
    )

    alerts = (
        db.query(FraudAlert)
        .filter(FraudAlert.account_id == account_id)
        .order_by(FraudAlert.created_at.desc())
        .all()
    )

    transactions = (
        db.query(Transaction)
        .filter(
            (Transaction.sender_account_id == account_id)
            | (Transaction.receiver_account_id == account_id)
        )
        .order_by(Transaction.transaction_timestamp.desc())
        .limit(20)
        .all()
    )

    return {
        "account": {
            "account_id": account.account_id,
            "account_number": account.account_number,
            "account_holder_name": account.account_holder_name,
            "account_type": account.account_type,
            "bank_name": account.bank_name,
            "current_balance": float(account.current_balance),
            "kyc_verified": account.kyc_verified,
            "status": account.status,
            "date_opened": account.date_opened,
        },

        "risk_score": (
            {
                "risk_score_id": risk_score.risk_score_id,
                "risk_score": float(risk_score.risk_score),
                "mule_probability": float(risk_score.mule_probability),
                "risk_level": risk_score.risk_level,
                "model_version": risk_score.model_version,
                "explanation": risk_score.explanation,
                "scored_at": risk_score.scored_at,
            }
            if risk_score
            else None
        ),

        "alerts": [
            {
                "alert_id": alert.alert_id,
                "transaction_id": alert.transaction_id,
                "risk_score_id": alert.risk_score_id,
                "alert_type": alert.alert_type,
                "severity": alert.severity,
                "status": alert.status,
                "reason": alert.reason,
                "created_at": alert.created_at,
            }
            for alert in alerts
        ],

        "transactions": [
            {
                "transaction_id": transaction.transaction_id,
                "amount": float(transaction.amount),
                "currency": transaction.currency,
                "transaction_type": transaction.transaction_type,
                "channel": transaction.channel,
                "status": transaction.status,
                "transaction_timestamp": transaction.transaction_timestamp,
                "description": transaction.description,
                "sender_account_id": transaction.sender_account_id,
                "receiver_account_id": transaction.receiver_account_id,
                "location": transaction.location,
                "device_id": transaction.device_id,
            }
            for transaction in transactions
        ],
    }
