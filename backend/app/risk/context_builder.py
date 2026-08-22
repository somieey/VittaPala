from datetime import timedelta

from sqlalchemy.orm import Session

from ..models import Transaction, Account
from .contracts import (
    RiskContext,
    TransactionData,
    AccountData,
)


def build_risk_context(
    transaction_id: int,
    db: Session,
) -> RiskContext:

    # ---------------------------------
    # 1. Load the transaction
    # ---------------------------------

    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.transaction_id == transaction_id
        )
        .first()
    )

    if not transaction:
        raise ValueError(
            f"Transaction {transaction_id} not found"
        )

    # ---------------------------------
    # 2. Determine the account to score
    # ---------------------------------

    account_id = transaction.sender_account_id

    if account_id is None:
        account_id = transaction.receiver_account_id

    if account_id is None:
        raise ValueError(
            "Transaction has no associated account"
        )

    account = (
        db.query(Account)
        .filter(
            Account.account_id == account_id
        )
        .first()
    )

    if not account:
        raise ValueError(
            f"Account {account_id} not found"
        )

    # ---------------------------------
    # 3. Convert transaction → snapshot
    # ---------------------------------

    transaction_data = TransactionData(
        transaction_id=transaction.transaction_id,
        amount=transaction.amount,
        channel=transaction.channel,
        transaction_timestamp=transaction.transaction_timestamp,
        device_fingerprint=transaction.device_fingerprint,
        sender_account_id=transaction.sender_account_id,
        receiver_account_id=transaction.receiver_account_id,
        device_id=transaction.device_id,
        ip_address=transaction.ip_address,
        location=transaction.location,
        transaction_type=transaction.transaction_type,
        status=transaction.status,
        merchant_category=transaction.merchant_category,
    )

    # ---------------------------------
    # 4. Convert account → snapshot
    # ---------------------------------

    account_data = AccountData(
        account_id=account.account_id,
        kyc_verified=account.kyc_verified,
        date_opened=account.date_opened,
    )

    # ---------------------------------
    # 5. Get recent transaction history
    # ---------------------------------

    history_start = (
        transaction.transaction_timestamp
        - timedelta(days=30)
    )

    recent_transactions = (
        db.query(Transaction)
        .filter(
            (
                (Transaction.sender_account_id == account_id)
                |
                (Transaction.receiver_account_id == account_id)
            ),
            Transaction.transaction_timestamp >= history_start,
            Transaction.transaction_timestamp <= transaction.transaction_timestamp,
            Transaction.transaction_id != transaction_id,
        )
        .order_by(
            Transaction.transaction_timestamp.desc()
        )
        .limit(100)
        .all()
    )

    # ---------------------------------
    # 6. Convert history to snapshots
    # ---------------------------------

    recent_transaction_data = [
        TransactionData(
            transaction_id=t.transaction_id,
            amount=t.amount,
            channel=t.channel,
            transaction_timestamp=t.transaction_timestamp,
            device_fingerprint=t.device_fingerprint,
            sender_account_id=t.sender_account_id,
            receiver_account_id=t.receiver_account_id,
            device_id=t.device_id,
            ip_address=t.ip_address,
            location=t.location,
            transaction_type=t.transaction_type,
            status=t.status,
            merchant_category=t.merchant_category,
        )
        for t in recent_transactions
    ]

    # ---------------------------------
    # 7. Build behavioral features
    # ---------------------------------

    outgoing_transactions = [
        t
        for t in recent_transactions
        if t.sender_account_id == account_id
    ]

    incoming_transactions = [
        t
        for t in recent_transactions
        if t.receiver_account_id == account_id
    ]

    known_devices = {
        t.device_fingerprint
        for t in recent_transactions
        if t.device_fingerprint
    }

    known_locations = {
        t.location
        for t in recent_transactions
        if t.location
    }

    known_receivers = {
        t.receiver_account_id
        for t in outgoing_transactions
        if t.receiver_account_id is not None
    }

    known_senders = {
        t.sender_account_id
        for t in incoming_transactions
        if t.sender_account_id is not None
    }

    total_transaction_count = len(
        recent_transactions
    )

    related_data = {
        "outgoing_transaction_count": len(
            outgoing_transactions
        ),
        "incoming_transaction_count": len(
            incoming_transactions
        ),
        "total_transaction_count": total_transaction_count,
        "known_devices": list(known_devices),
        "known_locations": list(known_locations),
        "known_receivers": list(known_receivers),
        "known_senders": list(known_senders),
        "unique_receiver_count": len(
            known_receivers
        ),
        "unique_sender_count": len(
            known_senders
        ),
    }

    # Network analysis will be added later.
    # For now, leave this empty.

    # ---------------------------------
    # 8. Build final RiskContext
    # ---------------------------------

    return RiskContext(
        transaction=transaction_data,
        account=account_data,
        recent_transactions=recent_transaction_data,
        related_data=related_data,
    )