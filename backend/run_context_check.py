from app.database import SessionLocal
from app.risk.context_builder import build_risk_context


def main():
    db = SessionLocal()

    try:
        context = build_risk_context(
            transaction_id=1,
            db=db,
        )

        print("\n=== TRANSACTION ===")
        print(context.transaction.model_dump())

        print("\n=== ACCOUNT ===")
        print(context.account.model_dump())

        print("\n=== RECENT TRANSACTIONS ===")
        for transaction in context.recent_transactions:
            print(transaction.model_dump())

        print("\n=== RELATED DATA ===")
        print(context.related_data)

    finally:
        db.close()


if __name__ == "__main__":
    main()