from datetime import datetime, timedelta
from decimal import Decimal

from app.risk.contracts import (
    AccountData,
    RiskContext,
    RiskLevel,
    TransactionData,
)
from app.risk.engines.rule_based import RuleBasedRiskEngine


def make_transaction(
    transaction_id=1,
    amount="1000.00",
    timestamp=None,
    device_fingerprint="FP-001",
    sender_account_id=1,
    receiver_account_id=2,
    location="Mumbai",
):
    return TransactionData(
        transaction_id=transaction_id,
        amount=Decimal(amount),
        channel="UPI",
        transaction_timestamp=timestamp or datetime(2026, 8, 22, 15, 0),
        device_fingerprint=device_fingerprint,
        device_id="DEVICE-001",
        ip_address="192.168.1.10",
        location=location,
        transaction_type="transfer",
        status="completed",
        merchant_category=None,
        sender_account_id=sender_account_id,
        receiver_account_id=receiver_account_id,
    )


def make_context(
    transaction,
    history=None,
    account_opened=datetime(2026, 1, 1).date(),
    related_data=None,
):
    account = AccountData(
        account_id=1,
        kyc_verified=True,
        date_opened=account_opened,
    )

    return RiskContext(
        transaction=transaction,
        account=account,
        recent_transactions=history or [],
        related_data=related_data or {
            "known_devices": ["FP-001"],
            "known_locations": ["Mumbai"],
            "known_receivers": [2],
            "known_senders": [2],
        },
    )


def test_normal_transaction_is_low_risk():
    transaction = make_transaction(amount="1000.00")

    context = make_context(transaction)

    result = RuleBasedRiskEngine().analyze(context)

    assert result.risk_level == RiskLevel.LOW
    assert result.risk_score == 0.0
    assert result.detected_patterns == []


def test_large_transaction_triggers_rule():
    history = [
        make_transaction(
            transaction_id=i,
            amount="1000.00",
            timestamp=datetime(2026, 8, 20, 10, 0) - timedelta(days=i),
        )
        for i in range(1, 5)
    ]

    transaction = make_transaction(
        amount="10000.00",
    )

    context = make_context(
        transaction,
        history=history,
    )

    result = RuleBasedRiskEngine().analyze(context)

    assert "LARGE_TRANSACTION" in [
        pattern.code for pattern in result.detected_patterns
    ]

    assert result.risk_score > 0


def test_new_device_triggers_rule():
    history = [
        make_transaction(
            transaction_id=2,
            amount="1000.00",
            device_fingerprint="FP-001",
        )
    ]

    transaction = make_transaction(
        amount="1000.00",
        device_fingerprint="NEW-DEVICE",
    )

    context = make_context(
        transaction,
        history=history,
    )

    result = RuleBasedRiskEngine().analyze(context)

    assert "NEW_DEVICE" in [
        pattern.code for pattern in result.detected_patterns
    ]


def test_new_receiver_triggers_rule():
    history = [
        make_transaction(
            transaction_id=2,
            receiver_account_id=2,
        )
    ]

    transaction = make_transaction(
        amount="1000.00",
        receiver_account_id=99,
    )

    context = make_context(
        transaction,
        history=history,
        related_data={
            "known_devices": ["FP-001"],
            "known_locations": ["Mumbai"],
            "known_receivers": [2],
            "known_senders": [2],
        },
    )

    result = RuleBasedRiskEngine().analyze(context)

    assert "NEW_RECEIVER" in [
        pattern.code for pattern in result.detected_patterns
    ]