from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import select

try:
    from app.database import SessionLocal
except ImportError:
    from sqlalchemy.orm import sessionmaker
    from app.database import engine

    SessionLocal = sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
    )

from app.models import Transaction


# Hidden marker used for duplicate detection.
SEED_TAG = "VP-SEED"

# Context shared by all demo rows.
LOCATION = "Mumbai"
DEVICE_FP = "FP-001"


# Historical transactions dated before transaction_id=1.
SEED_TRANSACTIONS = [

    # ---------------------------------
    # Normal outgoing transactions
    # ---------------------------------

    {
        "ref": "hist-01",
        "sender": 1,
        "receiver": 2,
        "amount": "850.00",
        "channel": "UPI",
        "type": "payment",
        "ts": datetime(2026, 7, 26, 9, 30),
        "note": "Grocery payment",
    },

    {
        "ref": "hist-02",
        "sender": 1,
        "receiver": 2,
        "amount": "1200.00",
        "channel": "UPI",
        "type": "transfer",
        "ts": datetime(2026, 7, 29, 18, 45),
        "note": "Dinner split",
    },

    {
        "ref": "hist-03",
        "sender": 1,
        "receiver": 2,
        "amount": "650.00",
        "channel": "UPI",
        "type": "payment",
        "ts": datetime(2026, 8, 2, 12, 15),
        "note": "Mobile recharge",
    },

    {
        "ref": "hist-04",
        "sender": 1,
        "receiver": 2,
        "amount": "2200.00",
        "channel": "UPI",
        "type": "transfer",
        "ts": datetime(2026, 8, 5, 20, 10),
        "note": "Online shopping",
    },

    {
        "ref": "hist-05",
        "sender": 1,
        "receiver": 2,
        "amount": "500.00",
        "channel": "UPI",
        "type": "payment",
        "ts": datetime(2026, 8, 9, 8, 5),
        "note": "Auto fare",
    },

    {
        "ref": "hist-06",
        "sender": 1,
        "receiver": 2,
        "amount": "1750.00",
        "channel": "UPI",
        "type": "payment",
        "ts": datetime(2026, 8, 12, 14, 30),
        "note": "Electricity bill",
    },

    {
        "ref": "hist-07",
        "sender": 1,
        "receiver": 2,
        "amount": "950.00",
        "channel": "UPI",
        "type": "payment",
        "ts": datetime(2026, 8, 16, 19, 20),
        "note": "Food order",
    },

    {
        "ref": "hist-08",
        "sender": 1,
        "receiver": 2,
        "amount": "3000.00",
        "channel": "UPI",
        "type": "transfer",
        "ts": datetime(2026, 8, 20, 11, 0),
        "note": "Rent share",
    },

    # ---------------------------------
    # Incoming transactions
    # ---------------------------------

    {
        "ref": "hist-09",
        "sender": 2,
        "receiver": 1,
        "amount": "1500.00",
        "channel": "UPI",
        "type": "transfer",
        "ts": datetime(2026, 7, 31, 16, 0),
        "note": "Money received",
    },

    {
        "ref": "hist-10",
        "sender": 2,
        "receiver": 1,
        "amount": "2000.00",
        "channel": "IMPS",
        "type": "transfer",
        "ts": datetime(2026, 8, 14, 10, 45),
        "note": "Refund received",
    },

    {
        "ref": "hist-11",
        "sender": 1,
        "receiver": 2,
        "amount": "1100.00",
        "channel": "NEFT",
        "type": "transfer",
        "ts": datetime(2026, 8, 18, 13, 30),
        "note": "Transfer to contact",
    },
]


def already_seeded(session, ref: str) -> bool:
    """
    Check whether this demo transaction already exists.
    """

    marker = f"%[{SEED_TAG}:{ref}]%"

    found = session.scalar(
        select(Transaction.transaction_id).where(
            Transaction.description.like(marker)
        )
    )

    return found is not None


def main() -> None:

    session = SessionLocal()

    inserted = 0
    skipped = 0

    try:

        for row in SEED_TRANSACTIONS:

            if already_seeded(session, row["ref"]):
                skipped += 1
                continue

            description = (
                f'{row["note"]} [{SEED_TAG}:{row["ref"]}]'
            )

            txn = Transaction(
                sender_account_id=row["sender"],
                receiver_account_id=row["receiver"],
                amount=Decimal(row["amount"]),
                currency="INR",
                transaction_type=row["type"],
                channel=row["channel"],
                status="completed",
                transaction_timestamp=row["ts"],
                description=description,
                device_fingerprint=DEVICE_FP,
                location=LOCATION,
                is_flagged=False,
            )

            session.add(txn)
            inserted += 1

        session.commit()

    except Exception:
        session.rollback()
        raise

    finally:
        session.close()

    print(
        f"Inserted {inserted} demo transaction(s); "
        f"skipped {skipped} already present."
    )


if __name__ == "__main__":
    main()