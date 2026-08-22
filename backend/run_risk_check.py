from app.database import SessionLocal
from app.risk.context_builder import build_risk_context
from app.risk.engines.rule_based import RuleBasedRiskEngine


def main():
    session = SessionLocal()

    try:
        context = build_risk_context(
            transaction_id=1,
            db=session,
        )

        result = RuleBasedRiskEngine().analyze(context)

        print(result.model_dump_json(indent=2))

    finally:
        session.close()


if __name__ == "__main__":
    main()