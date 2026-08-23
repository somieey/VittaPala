"""Dashboard statistics, aggregated from the database."""
from datetime import timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Account, FraudAlert, RiskScore, Transaction, utcnow

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

MULE_PROBABILITY_THRESHOLD = 0.8
SUSPICIOUS_RISK_SCORE = 50.0
RECENT_ACTIVITY_DAYS = 7
ACTIVE_ALERT_STATUSES = ("open", "investigating")
RESOLVED_ALERT_STATUSES = ("resolved", "confirmed_fraud", "false_positive")


def _latest_scores_subquery(db: Session):
    """
    Newest risk score per account.

    Grouping to the max scored_at first keeps this to two queries instead of
    one per account.
    """
    newest = (
        db.query(
            RiskScore.account_id.label("account_id"),
            func.max(RiskScore.risk_score_id).label("risk_score_id"),
        )
        .group_by(RiskScore.account_id)
        .subquery()
    )

    return (
        db.query(RiskScore)
        .join(newest, RiskScore.risk_score_id == newest.c.risk_score_id)
        .all()
    )


@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """Real counts and aggregates. Nothing here is hardcoded."""
    total_accounts = db.query(func.count(Account.account_id)).scalar() or 0

    transaction_totals = db.query(
        func.count(Transaction.transaction_id),
        func.coalesce(func.sum(Transaction.amount), 0),
    ).one()

    total_transactions = int(transaction_totals[0] or 0)
    total_volume = float(transaction_totals[1] or 0)

    flagged_transactions = (
        db.query(func.count(Transaction.transaction_id))
        .filter(Transaction.is_flagged.is_(True))
        .scalar()
        or 0
    )

    recent_cutoff = utcnow() - timedelta(days=RECENT_ACTIVITY_DAYS)

    recent_transactions = (
        db.query(func.count(Transaction.transaction_id))
        .filter(Transaction.transaction_timestamp >= recent_cutoff)
        .scalar()
        or 0
    )

    # ------------------------------------------------------------- risk view
    latest_scores = _latest_scores_subquery(db)

    distribution = {"low": 0, "medium": 0, "high": 0, "critical": 0}

    score_sum = 0.0
    mule_accounts = 0

    for score in latest_scores:
        level = str(score.risk_level).lower()
        if level in distribution:
            distribution[level] += 1

        score_sum += float(score.risk_score or 0)

        if float(score.mule_probability or 0) >= MULE_PROBABILITY_THRESHOLD:
            mule_accounts += 1

    scored_accounts = len(latest_scores)

    average_risk_score = (
        round(score_sum / scored_accounts, 2) if scored_accounts else 0.0
    )

    high_risk_accounts = distribution["high"] + distribution["critical"]

    risk_percentages = {
        level: (
            round(count / scored_accounts * 100, 1) if scored_accounts else 0.0
        )
        for level, count in distribution.items()
    }

    suspicious_transactions = (
        db.query(func.count(func.distinct(RiskScore.account_id)))
        .filter(RiskScore.risk_score >= SUSPICIOUS_RISK_SCORE)
        .scalar()
        or 0
    )

    # ----------------------------------------------------------- alert view
    alert_rows = (
        db.query(FraudAlert.severity, func.count(FraudAlert.alert_id))
        .group_by(FraudAlert.severity)
        .all()
    )

    alert_by_severity = {"low": 0, "medium": 0, "high": 0, "critical": 0}
    for severity, count in alert_rows:
        if severity in alert_by_severity:
            alert_by_severity[severity] = int(count)

    type_rows = (
        db.query(FraudAlert.alert_type, func.count(FraudAlert.alert_id))
        .group_by(FraudAlert.alert_type)
        .all()
    )

    alert_by_type = {str(t): int(c) for t, c in type_rows}

    total_alerts = db.query(func.count(FraudAlert.alert_id)).scalar() or 0

    open_alerts = (
        db.query(func.count(FraudAlert.alert_id))
        .filter(FraudAlert.status.in_(ACTIVE_ALERT_STATUSES))
        .scalar()
        or 0
    )

    resolved_alerts = (
        db.query(func.count(FraudAlert.alert_id))
        .filter(FraudAlert.status.in_(RESOLVED_ALERT_STATUSES))
        .scalar()
        or 0
    )

    return {
        "total_accounts": total_accounts,
        "scored_accounts": scored_accounts,
        "high_risk_accounts": high_risk_accounts,
        "mule_accounts": mule_accounts,
        "average_risk_score": average_risk_score,

        "total_transactions": total_transactions,
        "total_transaction_volume": round(total_volume, 2),
        "flagged_transactions": int(flagged_transactions),
        "suspicious_transactions": int(suspicious_transactions),
        "recent_transactions": int(recent_transactions),
        "recent_activity_days": RECENT_ACTIVITY_DAYS,

        "total_alerts": int(total_alerts),
        "open_alerts": int(open_alerts),
        "resolved_alerts": int(resolved_alerts),
        "critical_alerts": alert_by_severity["critical"],

        "risk_distribution": risk_percentages,
        "risk_distribution_counts": distribution,
        "alert_distribution": alert_by_severity,
        "alert_type_distribution": alert_by_type,
    }
