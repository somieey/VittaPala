from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas.risk import RiskAnalysisResponse
from ..risk.service import analyze_transaction
from ..risk.engines.rule_based import RuleBasedRiskEngine


router = APIRouter(
    prefix="/api/risk",
    tags=["Risk Analysis"],
)


@router.post(
    "/analyze/{transaction_id}",
    response_model=RiskAnalysisResponse,
)
def analyze_transaction_endpoint(
    transaction_id: int,
    db: Session = Depends(get_db),
):

    try:
        result, risk_score = analyze_transaction(
            transaction_id=transaction_id,
            db=db,
            engine=RuleBasedRiskEngine(),
        )

    except ValueError as e:
        raise HTTPException(
            status_code=404,
            detail=str(e),
        )

    return RiskAnalysisResponse(
        transaction_id=transaction_id,
        risk_score_id=risk_score.risk_score_id,

        anomaly_score=result.anomaly_score,
        risk_score=result.risk_score,
        mule_probability=result.mule_probability,
        risk_level=result.risk_level.value,

        explanation=result.explanation,

        detected_patterns=[
            pattern.model_dump()
            for pattern in result.detected_patterns
        ],

        model_version=result.model_version,
    )