from sqlalchemy.orm import Session

from ..models import RiskScore, FraudAlert
from .context_builder import build_risk_context
from .contracts import RiskEngine, RiskLevel


# Pattern code → database alert_type
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
}


# Severity ordering, used to keep the most serious reason when several
# patterns collapse onto the same alert_type.
_SEVERITY_RANK = {
    "critical": 3,
    "high": 2,
    "medium": 1,
    "low": 0,
}


def analyze_transaction(
    transaction_id: int,
    db: Session,
    engine: RiskEngine,
):
    # ---------------------------------
    # 1. Build the risk context
    # ---------------------------------

    context = build_risk_context(
        transaction_id,
        db,
    )

    # ---------------------------------
    # 2. Run the risk engine
    # ---------------------------------

    result = engine.analyze(context)

    # ---------------------------------
    # 3. Save risk score
    # ---------------------------------

    risk_score = RiskScore(
        account_id=context.account.account_id,
        risk_score=result.risk_score,
        mule_probability=result.mule_probability,
        risk_level=result.risk_level.value,
        model_version=result.model_version,
        explanation=result.explanation,
    )

    db.add(risk_score)

    # We need the ID before creating fraud alerts.
    db.flush()

    # ---------------------------------
    # 4. Update transaction anomaly score
    # ---------------------------------

    # Import here to avoid unnecessary module-level coupling.
    from ..models import Transaction

    transaction = (
        db.query(Transaction)
        .filter(
            Transaction.transaction_id == transaction_id
        )
        .first()
    )

    if transaction:
        transaction.anomaly_score = result.anomaly_score

        if result.risk_level in (
            RiskLevel.HIGH,
            RiskLevel.CRITICAL,
        ):
            transaction.is_flagged = True

    # ---------------------------------
    # 5. Create fraud alerts
    # ---------------------------------

    # Tracks the alert_type used by the generic alert below, so the
    # pattern loop can avoid emitting a duplicate of it.
    generic_alert_type = None

    if result.risk_level in (
        RiskLevel.HIGH,
        RiskLevel.CRITICAL,
    ):

        generic_alert_type = (
            "mule_account"
            if result.mule_probability >= 0.8
            else "anomalous_transaction"
        )

        
        db.add(
            FraudAlert(
                account_id=context.account.account_id,
                transaction_id=transaction_id,
                risk_score_id=risk_score.risk_score_id,
                alert_type=generic_alert_type,
                severity=result.risk_level.value,
                status="open",
                reason="; ".join(
                    result.explanation.get("reasons", [])
                ),
            )
        )

    # ---------------------------------
    # 6. Create pattern-specific alerts
    # ---------------------------------

    # Most severe first, so the alert kept for each alert_type carries the
    # most serious reason. Ties break on code for a deterministic result.
    ordered_patterns = sorted(
        result.detected_patterns,
        key=lambda p: (
            -_SEVERITY_RANK.get(p.severity.value, 0),
            p.code,
        ),
    )

    # Tracks every alert_type already written for this analysis.
    created_alert_types = set()

    if generic_alert_type:
        created_alert_types.add(generic_alert_type)

    for pattern in ordered_patterns:

        mapped_alert_type = ALERT_TYPE_MAP.get(
            pattern.code
        )

        if not mapped_alert_type:
            continue

        # One alert per alert_type. Covers both the generic alert above
        # and earlier patterns that mapped onto the same type.
        if mapped_alert_type in created_alert_types:
            continue

        created_alert_types.add(mapped_alert_type)

        db.add(
            FraudAlert(
                account_id=context.account.account_id,
                transaction_id=transaction_id,
                risk_score_id=risk_score.risk_score_id,
                alert_type=mapped_alert_type,
                severity=pattern.severity.value,
                status="open",
                reason=pattern.description,
            )
        )

    # ---------------------------------
    # 7. Commit everything
    # ---------------------------------

    db.commit()

    db.refresh(risk_score)

    return result, risk_score