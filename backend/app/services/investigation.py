"""
Account investigation aggregation.

Kept out of the router so the endpoint stays thin and this logic can be
reused and tested on its own.
"""
from collections import Counter
from decimal import Decimal
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models import Account, FraudAlert, RiskScore, Transaction

# How many recent rows the investigation view returns.
RECENT_TRANSACTION_LIMIT = 20
RISK_HISTORY_LIMIT = 10

ACTIVE_ALERT_STATUSES = ("open", "investigating")

RUPEE = "₹"


def _decimal(value) -> float:
    return float(value or Decimal("0"))


def _account_payload(account: Account) -> dict:
    return {
        "account_id": account.account_id,
        "account_number": account.account_number,
        "account_holder_name": account.account_holder_name,
        "account_type": account.account_type,
        "ifsc_code": account.ifsc_code,
        "bank_name": account.bank_name,
        "current_balance": _decimal(account.current_balance),
        "kyc_verified": account.kyc_verified,
        "status": account.status,
        "date_opened": account.date_opened,
        "created_at": account.created_at,
    }


def _transaction_payload(t: Transaction, account_id: int) -> dict:
    return {
        "transaction_id": t.transaction_id,
        "amount": _decimal(t.amount),
        "currency": t.currency,
        "transaction_type": t.transaction_type,
        "channel": t.channel,
        "status": t.status,
        "transaction_timestamp": t.transaction_timestamp,
        "description": t.description,
        "sender_account_id": t.sender_account_id,
        "receiver_account_id": t.receiver_account_id,
        "location": t.location,
        "device_id": t.device_id,
        "device_fingerprint": t.device_fingerprint,
        "anomaly_score": float(t.anomaly_score) if t.anomaly_score else None,
        "is_flagged": t.is_flagged,
        "direction": (
            "outgoing" if t.sender_account_id == account_id else "incoming"
        ),
    }


def _risk_payload(score: Optional[RiskScore]) -> Optional[dict]:
    if score is None:
        return None

    return {
        "risk_score_id": score.risk_score_id,
        "risk_score": _decimal(score.risk_score),
        "mule_probability": _decimal(score.mule_probability),
        "risk_level": score.risk_level,
        "model_version": score.model_version,
        "explanation": score.explanation,
        "scored_at": score.scored_at,
    }


def _alert_payload(alert: FraudAlert) -> dict:
    return {
        "alert_id": alert.alert_id,
        "transaction_id": alert.transaction_id,
        "risk_score_id": alert.risk_score_id,
        "alert_type": alert.alert_type,
        "severity": alert.severity,
        "status": alert.status,
        "reason": alert.reason,
        "created_at": alert.created_at,
        "resolved_at": alert.resolved_at,
    }


def _summarise(
    account: Account,
    latest_risk: Optional[RiskScore],
    active_alerts: int,
    outgoing_total: float,
    incoming_total: float,
    counterparties: int,
) -> str:
    """A short, human-readable verdict for the investigator."""
    if latest_risk is None:
        return (
            f"Account {account.account_number} has not been risk-scored yet. "
            f"Run a risk analysis on one of its transactions to populate "
            f"this view."
        )

    level = str(latest_risk.risk_level).upper()

    parts = [
        f"Account {account.account_number} is currently rated {level} "
        f"({_decimal(latest_risk.risk_score):.0f}/100) with a mule "
        f"probability of {_decimal(latest_risk.mule_probability) * 100:.0f}%."
    ]

    parts.append(
        f"It received {RUPEE}{incoming_total:,.0f} and sent "
        f"{RUPEE}{outgoing_total:,.0f} across {counterparties} counterparties."
    )

    if incoming_total > 0:
        forwarded = outgoing_total / incoming_total * 100
        parts.append(f"That is {forwarded:.0f}% of incoming funds forwarded on.")

    if active_alerts:
        parts.append(f"{active_alerts} alert(s) are currently active.")
    else:
        parts.append("No alerts are currently active.")

    return " ".join(parts)


def build_investigation(db: Session, account: Account) -> dict:
    """Assemble everything an investigator needs for one account."""
    account_id = account.account_id

    involved = (
        (Transaction.sender_account_id == account_id)
        | (Transaction.receiver_account_id == account_id)
    )

    # Aggregates are computed in the database rather than in Python.
    totals = (
        db.query(
            func.count(Transaction.transaction_id),
            func.coalesce(func.sum(Transaction.amount), 0),
        )
        .filter(involved)
        .one()
    )

    outgoing = (
        db.query(
            func.count(Transaction.transaction_id),
            func.coalesce(func.sum(Transaction.amount), 0),
        )
        .filter(Transaction.sender_account_id == account_id)
        .one()
    )

    incoming = (
        db.query(
            func.count(Transaction.transaction_id),
            func.coalesce(func.sum(Transaction.amount), 0),
        )
        .filter(Transaction.receiver_account_id == account_id)
        .one()
    )

    flagged_count = (
        db.query(func.count(Transaction.transaction_id))
        .filter(involved, Transaction.is_flagged.is_(True))
        .scalar()
    )

    recent = (
        db.query(Transaction)
        .filter(involved)
        .order_by(Transaction.transaction_timestamp.desc())
        .limit(RECENT_TRANSACTION_LIMIT)
        .all()
    )

    risk_history = (
        db.query(RiskScore)
        .filter(RiskScore.account_id == account_id)
        .order_by(RiskScore.scored_at.desc())
        .limit(RISK_HISTORY_LIMIT)
        .all()
    )

    latest_risk = risk_history[0] if risk_history else None

    alerts = (
        db.query(FraudAlert)
        .filter(FraudAlert.account_id == account_id)
        .order_by(FraudAlert.created_at.desc())
        .all()
    )

    active_alerts = [a for a in alerts if a.status in ACTIVE_ALERT_STATUSES]

    # Behavioural fingerprints, drawn from the transactions we actually hold.
    devices = sorted({t.device_fingerprint for t in recent if t.device_fingerprint})
    locations = sorted({t.location for t in recent if t.location})

    counterparty_counter: Counter = Counter()
    for t in recent:
        other = (
            t.receiver_account_id
            if t.sender_account_id == account_id
            else t.sender_account_id
        )
        if other is not None:
            counterparty_counter[other] += 1

    detected_patterns = []
    if latest_risk and isinstance(latest_risk.explanation, dict):
        detected_patterns = latest_risk.explanation.get("findings", []) or []

    outgoing_total = _decimal(outgoing[1])
    incoming_total = _decimal(incoming[1])

    mule_indicators = {
        "pass_through_ratio": (
            round(outgoing_total / incoming_total, 4)
            if incoming_total > 0
            else None
        ),
        "unique_counterparties": len(counterparty_counter),
        "shared_devices": len(devices),
        "distinct_locations": len(locations),
        "flagged_transactions": int(flagged_count or 0),
        "active_alerts": len(active_alerts),
        "mule_probability": (
            _decimal(latest_risk.mule_probability) if latest_risk else None
        ),
    }

    return {
        "account": _account_payload(account),
        "statistics": {
            "transaction_count": int(totals[0] or 0),
            "transaction_volume": _decimal(totals[1]),
            "outgoing_count": int(outgoing[0] or 0),
            "outgoing_total": outgoing_total,
            "incoming_count": int(incoming[0] or 0),
            "incoming_total": incoming_total,
            "net_position": round(incoming_total - outgoing_total, 2),
            "flagged_transactions": int(flagged_count or 0),
        },
        "risk_score": _risk_payload(latest_risk),
        "risk_history": [_risk_payload(r) for r in risk_history],
        "detected_patterns": detected_patterns,
        "alerts": [_alert_payload(a) for a in alerts],
        "active_alert_count": len(active_alerts),
        "transactions": [_transaction_payload(t, account_id) for t in recent],
        "devices": devices,
        "locations": locations,
        "counterparties": [
            {"account_id": acc, "transaction_count": count}
            for acc, count in counterparty_counter.most_common()
        ],
        "mule_indicators": mule_indicators,
        "summary": _summarise(
            account,
            latest_risk,
            len(active_alerts),
            outgoing_total,
            incoming_total,
            len(counterparty_counter),
        ),
    }
