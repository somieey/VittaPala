"""Fraud alert endpoints and lifecycle management."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..models import FraudAlert, utcnow
from ..database import get_db
from ..schemas.alerts import AlertStatusUpdate, FraudAlertResponse

router = APIRouter(prefix="/api/alerts", tags=["Fraud Alerts"])

# Reaching one of these ends the alert's life and stamps resolved_at.
TERMINAL_STATUSES = ("confirmed_fraud", "false_positive", "resolved")


@router.get("/", response_model=list[FraudAlertResponse])
def list_alerts(
    db: Session = Depends(get_db),
    alert_status: Optional[str] = Query(None, alias="status"),
    severity: Optional[str] = None,
    alert_type: Optional[str] = None,
    account_id: Optional[int] = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """List fraud alerts, newest first, with optional filters."""
    query = db.query(FraudAlert)

    if alert_status:
        query = query.filter(FraudAlert.status == alert_status)

    if severity:
        query = query.filter(FraudAlert.severity == severity)

    if alert_type:
        query = query.filter(FraudAlert.alert_type == alert_type)

    if account_id is not None:
        query = query.filter(FraudAlert.account_id == account_id)

    return (
        query.order_by(FraudAlert.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.get("/{alert_id}", response_model=FraudAlertResponse)
def get_alert(alert_id: int, db: Session = Depends(get_db)):
    alert = db.query(FraudAlert).filter(FraudAlert.alert_id == alert_id).first()

    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")

    return alert


@router.patch("/{alert_id}/status", response_model=FraudAlertResponse)
def update_alert_status(
    alert_id: int,
    payload: AlertStatusUpdate,
    db: Session = Depends(get_db),
):
    """
    Move an alert through its lifecycle.

    Terminal statuses stamp resolved_at; returning an alert to an active
    status clears it again so the field never lies.
    """
    alert = db.query(FraudAlert).filter(FraudAlert.alert_id == alert_id).first()

    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = payload.status

    if payload.status in TERMINAL_STATUSES:
        alert.resolved_at = utcnow()
    else:
        alert.resolved_at = None

    if payload.note:
        alert.reason = f"{alert.reason or ''}\n[investigator] {payload.note}".strip()

    db.commit()
    db.refresh(alert)

    return alert
