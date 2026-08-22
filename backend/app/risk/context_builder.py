from datetime import timedelta

from sqlalchemy.orm import Session

from ..models import Transaction, Account
from .contracts import (
    RiskContext,
    TransactionData,
    AccountData,
)


# How far back the behavioural history window reaches.
HISTORY_DAYS = 30

# Dormancy needs to know what happened *before* the history window, so it
# looks further back but only pulls aggregates, never rows.
PRIOR_ACTIVITY_DAYS = 180

# Device-reuse lookback, and a hard cap so a widely shared fingerprint
# cannot pull an unbounded number of rows.
DEVICE_LOOKBACK_DAYS = 90
DEVICE_LOOKUP_LIMIT = 500


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
        - timedelta(days=HISTORY_DAYS)
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

    # ---------------------------------
    # 7b. Device reuse across accounts
    # ---------------------------------

    # A fingerprint shared by several accounts is a mule-network signal.
    # Only the *initiating* side is counted: the sender is the party that
    # actually operated the device.

    device_fingerprint = transaction.device_fingerprint

    device_account_ids: list[int] = []

    if device_fingerprint:

        device_window_start = (
            transaction.transaction_timestamp
            - timedelta(days=DEVICE_LOOKBACK_DAYS)
        )

        device_rows = (
            db.query(Transaction.sender_account_id)
            .filter(
                Transaction.device_fingerprint == device_fingerprint,
                Transaction.sender_account_id.isnot(None),
                Transaction.transaction_timestamp >= device_window_start,
                Transaction.transaction_timestamp <= transaction.transaction_timestamp,
            )
            .distinct()
            .limit(DEVICE_LOOKUP_LIMIT)
            .all()
        )

        device_account_ids = sorted(
            {row[0] for row in device_rows if row[0] is not None}
        )

    # ---------------------------------
    # 7c. Activity before the history window
    # ---------------------------------

    # Used by dormancy detection: an account that was quiet for months and
    # then suddenly moves money behaves differently from a steady account.

    prior_window_start = (
        transaction.transaction_timestamp
        - timedelta(days=PRIOR_ACTIVITY_DAYS)
    )

    prior_activity_count = (
        db.query(Transaction.transaction_id)
        .filter(
            (
                (Transaction.sender_account_id == account_id)
                |
                (Transaction.receiver_account_id == account_id)
            ),
            Transaction.transaction_timestamp >= prior_window_start,
            Transaction.transaction_timestamp < history_start,
        )
        .count()
    )

    # Gap between this transaction and the account's previous activity.
    days_since_previous_activity = None

    previous_timestamp = (
        db.query(Transaction.transaction_timestamp)
        .filter(
            (
                (Transaction.sender_account_id == account_id)
                |
                (Transaction.receiver_account_id == account_id)
            ),
            Transaction.transaction_timestamp < transaction.transaction_timestamp,
            Transaction.transaction_id != transaction_id,
        )
        .order_by(
            Transaction.transaction_timestamp.desc()
        )
        .limit(1)
        .scalar()
    )

    if previous_timestamp is not None:
        days_since_previous_activity = round(
            (
                transaction.transaction_timestamp - previous_timestamp
            ).total_seconds()
            / 86400.0,
            4,
        )

    # ---------------------------------
    # 8. Assemble related data
    # ---------------------------------

    related_data = {
        "outgoing_transaction_count": len(
            outgoing_transactions
        ),
        "incoming_transaction_count": len(
            incoming_transactions
        ),
        "total_transaction_count": total_transaction_count,
        # Sorted, not raw set order: the engine puts these into
        # human-readable explanations, which must be reproducible.
        "known_devices": sorted(known_devices),
        "known_locations": sorted(known_locations),
        "known_receivers": sorted(known_receivers),
        "known_senders": sorted(known_senders),
        "unique_receiver_count": len(
            known_receivers
        ),
        "unique_sender_count": len(
            known_senders
        ),

        "history_window_days": HISTORY_DAYS,

        # Device reuse.
        "device_fingerprint": device_fingerprint,
        "device_account_ids": device_account_ids,
        "device_account_count": len(device_account_ids),
        "device_lookback_days": DEVICE_LOOKBACK_DAYS,

        # Dormancy.
        "prior_activity_count": prior_activity_count,
        "prior_activity_days": PRIOR_ACTIVITY_DAYS,
        "days_since_previous_activity": days_since_previous_activity,
    }

    # Multi-hop network analysis (shared-counterparty graphs, cycles longer
    # than a direct round trip) is Network Intelligence's area and is not
    # built here.

    # ---------------------------------
    # 9. Build final RiskContext
    # ---------------------------------

    return RiskContext(
        transaction=transaction_data,
        account=account_data,
        recent_transactions=recent_transaction_data,
        related_data=related_data,
    )