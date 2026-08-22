from pydantic import BaseModel, ConfigDict


class RiskAnalysisResponse(BaseModel):
    transaction_id: int
    risk_score_id: int

    anomaly_score: float | None
    risk_score: float
    mule_probability: float
    risk_level: str

    explanation: dict
    detected_patterns: list[dict]

    model_version: str

    model_config = ConfigDict(from_attributes=True)