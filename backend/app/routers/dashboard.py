from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Account, RiskScore, FraudAlert


router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"],
)


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
):
    # ---------------------------------
    # Total accounts
    # ---------------------------------
    total_accounts = db.query(Account).count()

    # ---------------------------------
    # Get latest risk score for each account
    # ---------------------------------
    risk_scores = (
        db.query(RiskScore)
        .order_by(
            RiskScore.account_id,
            RiskScore.risk_score_id.desc(),
        )
        .all()
    )

    latest_scores = {}

    for score in risk_scores:
        if score.account_id not in latest_scores:
            latest_scores[score.account_id] = score

    # ---------------------------------
    # Risk distribution
    # ---------------------------------
    low_count = 0
    medium_count = 0
    high_count = 0
    critical_count = 0

    for score in latest_scores.values():
        risk_level = (
            score.risk_level.value
            if hasattr(score.risk_level, "value")
            else str(score.risk_level).lower()
        )

        if risk_level == "low":
            low_count += 1
        elif risk_level == "medium":
            medium_count += 1
        elif risk_level == "high":
            high_count += 1
        elif risk_level == "critical":
            critical_count += 1

    total_risk_scored = (
        low_count
        + medium_count
        + high_count
        + critical_count
    )

    if total_risk_scored > 0:
        low_percentage = round(
            (low_count / total_risk_scored) * 100,
            1,
        )
        medium_percentage = round(
            (medium_count / total_risk_scored) * 100,
            1,
        )
        high_percentage = round(
            (high_count / total_risk_scored) * 100,
            1,
        )
        critical_percentage = round(
            (critical_count / total_risk_scored) * 100,
            1,
        )
    else:
        low_percentage = 0
        medium_percentage = 0
        high_percentage = 0
        critical_percentage = 0

    # ---------------------------------
    # High-risk accounts
    # ---------------------------------
    high_risk_accounts = high_count + critical_count

    # ---------------------------------
    # Mule accounts
    # ---------------------------------
    mule_accounts = sum(
        1
        for score in latest_scores.values()
        if float(score.mule_probability or 0) >= 0.8
    )

    # ---------------------------------
    # Critical alerts
    # ---------------------------------
    critical_alerts = (
        db.query(FraudAlert)
        .filter(FraudAlert.severity == "critical")
        .count()
    )

    return {
        "total_accounts": total_accounts,
        "high_risk_accounts": high_risk_accounts,
        "critical_alerts": critical_alerts,
        "mule_accounts": mule_accounts,
        "risk_distribution": {
            "low": low_percentage,
            "medium": medium_percentage,
            "high": high_percentage,
            "critical": critical_percentage,
        },
    }