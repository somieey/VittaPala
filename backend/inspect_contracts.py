from app.risk.contracts import (
    TransactionData,
    AccountData,
    RiskContext,
    RiskResult,
    DetectedPattern,
    RiskLevel,
)

for name, model in [
    ("TransactionData", TransactionData),
    ("AccountData", AccountData),
    ("RiskContext", RiskContext),
    ("RiskResult", RiskResult),
    ("DetectedPattern", DetectedPattern),
]:
    print(f"\n{name}:")
    for fname, finfo in model.model_fields.items():
        print(f"  {fname}: {finfo.annotation}")

print("\nRiskLevel:", [m.value for m in RiskLevel])