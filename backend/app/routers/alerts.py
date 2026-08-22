from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import FraudAlert
from ..schemas.alerts import FraudAlertResponse


router = APIRouter(
    prefix="/api/alerts",
    tags=["Fraud Alerts"],
)


@router.get("/", response_model=list[FraudAlertResponse])
def get_alerts(
    db: Session = Depends(get_db),
):
    return (
        db.query(FraudAlert)
        .order_by(FraudAlert.created_at.desc())
        .all()
    )