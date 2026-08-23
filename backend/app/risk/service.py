"""
Risk analysis orchestration: build context, run the engine, persist results.

Persistence rules
-----------------
* Every analysis appends a RiskScore row. That history is an audit trail and
  is deliberately preserved.
* Alerts are idempotent. Re-analysing the same transaction updates the
  existing active alert instead of inserting another one, so a repeatedly
  analysed transaction cannot accumulate an unbounded pile of identical
  open alerts.
"""
from typing import Optional

from sqlalchemy.orm import Session

from ..models import FraudAlert, RiskScore, Transaction
from .context_builder import build_risk_context
from .contracts import DetectedPattern, RiskContext, RiskEngine, RiskLevel, RiskResult

# Pattern code -> database alert_type
ALERT_TYPE_MAP = {
    "LARGE_TRANSACTION": "anomalous_transaction",
    "NEW_ACCOUNT": "mule_account",
    "NEW_DEVICE": "anomalous_transaction",
    "NEW_LOCATION": "anomalous_transaction",
    "NEW_RECEIVER": "anomalous_transaction",
    "HIGH_VELOCITY": "rapid_movement",
    "STRUCTURING": "structuring",

    # Loophole / mule-behaviour rules.
    "RAPID_MOVEMENT": "rapid_movement",
    "BURST_ACTIVITY": "rapid_movement",
    "PASS_THROUGH": "mule_account",
    "DORMANT_ACTIVATION": "mule_account",
    "FAN_IN": "network_pattern",
    "FAN_OUT": "network_pattern",
    "CIRCULAR_FLOW": "network_pattern",
    "DEVICE_REUSE": "network_pattern",
    "LOCATION_ANOMALY": "anomalous_transaction",
    "FAILED_BURST": "anomalous_transaction",
    "VOLUME_SPIKE": "structuring",
    "BASELINE_SHIFT": "anomalous_transaction",
}

# Severity ordering, used to keep the most serious reason when several
# patterns collapse onto the same alert_type.
_SEVERITY_RANK = {
    "critical": 3,
    "high": 2,
    "medium": 1,
    "low": 0,
}

# An alert in one of these states is still live, so it is reused rather than
# duplicated. Resolved / dismissed alerts stay untouched as history; a finding
# that recurs after resolution correctly opens a fresh alert.
ACTIVE_ALERT_STATUSES = ("open", "investigating")

# These describe the account, not one transaction, so a single active alert
# per account is correct no matter which transaction surfaced it.
ACCOUNT_SCOPED_ALERT_TYPES = frozenset({"mule_account", "network_pattern"})


def _find_active_alert(
    db: Session,
    account_id: int,
    transaction_id: int,
    alert_type: str,
) -> Optional[FraudAlert]:
    """
    Locate an existing live alert this finding should update.

    Account-scoped types match on the account alone. Everything else is tied
    to the transaction that produced it.
    """
    query = db.query(FraudAlert).filter(
        FraudAlert.account_id == account_id,
        FraudAlert.alert_type == alert_type,
        FraudAlert.status.in_(ACTIVE_ALERT_STATUSES),
    )

    if alert_type not in ACCOUNT_SCOPED_ALERT_TYPES:
        query = query.filter(FraudAlert.transaction_id == transaction_id)

    return query.order_by(FraudAlert.created_at.desc()).first()


def _upsert_alert(
    db: Session,
    account_id: int,
    transaction_id: int,
    risk_score_id: int,
    alert_type: str,
    severity: str,
    reason: str,
) -> tuple[FraudAlert, bool]:
    """
    Create the alert, or refresh the live one that already covers it.

    Returns (alert, created) so callers can report what actually happened.
    """
    existing = _find_active_alert(db, account_id, transaction_id, alert_type)

    if existing is not None:
        # Point the alert at the newest evidence. created_at is left alone so
        # "first seen" stays meaningful.
        existing.severity = severity
        existing.reason = reason
        existing.risk_score_id = risk_score_id
        existing.transaction_id = transaction_id
        return existing, False

    alert = FraudAlert(
        account_id=account_id,
        transaction_id=transaction_id,
        risk_score_id=risk_score_id,
        alert_type=alert_type,
        severity=severity,
        status="open",
        reason=reason,
    )
    db.add(alert)
    return alert, True


def _ordered_patterns(patterns: list[DetectedPattern]) -> list[DetectedPattern]:
    """Most severe first, ties broken on code, so results are deterministic."""
    return sorted(
        patterns,
        key=lambda p: (-_SEVERITY_RANK.get(p.severity.value, 0), p.code),
    )


def _persist_risk_score(
    db: Session,
    context: RiskContext,
    result: RiskResult,
) -> RiskScore:
    risk_score = RiskScore(
        account_id=context.account.account_id,
        risk_score=result.risk_score,
        mule_probability=result.mule_probability,
        risk_level=result.risk_level.value,
        model_version=result.model_version,
        explanation=result.explanation,
    )

    db.add(risk_score)

    # The primary key is needed before alerts can reference it.
    db.flush()

    return risk_score


def _update_transaction_flags(
    db: Session,
    transaction_id: int,
    result: RiskResult,
) -> None:
    transaction = (
        db.query(Transaction)
        .filter(Transaction.transaction_id == transaction_id)
        .first()
    )

    if transaction is None:
        return

    transaction.anomaly_score = result.anomaly_score
    transaction.is_flagged = result.risk_level in (
        RiskLevel.HIGH,
        RiskLevel.CRITICAL,
    )


def analyze_transaction(
    transaction_id: int,
    db: Session,
    engine: RiskEngine,
) -> tuple[RiskResult, RiskScore]:
    """
    Score one transaction and persist the outcome.

    Raises ValueError when the transaction or its account cannot be found;
    the router maps that to a 404.
    """
    context = build_risk_context(transaction_id, db)
    result = engine.analyze(context)

    risk_score = _persist_risk_score(db, context, result)
    _update_transaction_flags(db, transaction_id, result)

    account_id = context.account.account_id

    # One alert per alert_type per analysis, and one live alert per
    # (scope, alert_type) across analyses.
    handled_types: set[str] = set()

    if result.risk_level in (RiskLevel.HIGH, RiskLevel.CRITICAL):
        generic_alert_type = (
            "mule_account"
            if result.mule_probability >= 0.8
            else "anomalous_transaction"
        )

        _upsert_alert(
            db,
            account_id=account_id,
            transaction_id=transaction_id,
            risk_score_id=risk_score.risk_score_id,
            alert_type=generic_alert_type,
            severity=result.risk_level.value,
            reason="; ".join(result.explanation.get("reasons", [])),
        )
        handled_types.add(generic_alert_type)

    for pattern in _ordered_patterns(result.detected_patterns):
        alert_type = ALERT_TYPE_MAP.get(pattern.code)

        if not alert_type or alert_type in handled_types:
            continue

        handled_types.add(alert_type)

        _upsert_alert(
            db,
            account_id=account_id,
            transaction_id=transaction_id,
            risk_score_id=risk_score.risk_score_id,
            alert_type=alert_type,
            severity=pattern.severity.value,
            reason=pattern.description,
        )

    db.commit()
    db.refresh(risk_score)

    return result, risk_score
