"""
Seed VittaPala with a realistic demonstration dataset.

Creates a small but complete cast of accounts and a transaction history that
exercises every detection capability the engine has: normal behaviour, a
legitimate large payment, a mule funnel, transaction splitting, rapid
pass-through, device reuse and counterparty fan-out.

Usage (PowerShell, from the backend directory):

    .\\venv\\Scripts\\python.exe seed_demo_data.py            # add demo data
    .\\venv\\Scripts\\python.exe seed_demo_data.py --reset    # wipe first

--reset clears transactions, risk scores and alerts so the demo starts from a
known state. It never touches anything outside those tables.
"""
from __future__ import annotations

import argparse
import sys
from datetime import date, datetime, timedelta
from decimal import Decimal

from sqlalchemy import select

from app.database import SessionLocal, engine
from app.models import Account, Base, FraudAlert, RiskScore, Transaction

# Everything is positioned relative to this instant so the demo always looks
# "recent" no matter when it is run.
NOW = datetime.now().replace(microsecond=0)

SEED_TAG = "VP-SEED"


def minutes(n: int) -> datetime:
    return NOW - timedelta(minutes=n)


def days(n: float) -> datetime:
    return NOW - timedelta(days=n)


# --------------------------------------------------------------------------- #
# Accounts
# --------------------------------------------------------------------------- #

ACCOUNTS = [
    {
        "key": "salary",
        "account_number": "XXXX1001",
        "account_holder_name": "Ananya Sharma",
        "account_type": "savings",
        "ifsc_code": "HDFC0001234",
        "bank_name": "HDFC Bank",
        "current_balance": "184500.00",
        "kyc_verified": True,
        "status": "active",
        "date_opened": date(2022, 4, 12),
    },
    {
        "key": "business",
        "account_number": "XXXX1002",
        "account_holder_name": "Kiran Traders",
        "account_type": "current",
        "ifsc_code": "ICIC0004567",
        "bank_name": "ICICI Bank",
        "current_balance": "952300.00",
        "kyc_verified": True,
        "status": "active",
        "date_opened": date(2021, 9, 3),
    },
    {
        "key": "mule",
        "account_number": "XXXX2001",
        "account_holder_name": "Rohit Verma",
        "account_type": "savings",
        "ifsc_code": "SBIN0007788",
        "bank_name": "State Bank of India",
        "current_balance": "4200.00",
        "kyc_verified": True,
        "status": "under_review",
        "date_opened": (NOW - timedelta(days=9)).date(),
    },
    {
        "key": "dormant",
        "account_number": "XXXX2002",
        "account_holder_name": "Sunil Patel",
        "account_type": "savings",
        "ifsc_code": "PUNB0112233",
        "bank_name": "Punjab National Bank",
        "current_balance": "15800.00",
        "kyc_verified": True,
        "status": "active",
        "date_opened": date(2019, 6, 20),
    },
    {
        "key": "payee_a",
        "account_number": "XXXX3001",
        "account_holder_name": "Meera Nair",
        "account_type": "savings",
        "ifsc_code": "AXIS0009911",
        "bank_name": "Axis Bank",
        "current_balance": "68100.00",
        "kyc_verified": True,
        "status": "active",
        "date_opened": date(2020, 2, 14),
    },
    {
        "key": "payee_b",
        "account_number": "XXXX3002",
        "account_holder_name": "Farhan Qureshi",
        "account_type": "wallet",
        "ifsc_code": None,
        "bank_name": "PayFast Wallet",
        "current_balance": "9400.00",
        "kyc_verified": False,
        "status": "active",
        "date_opened": date(2023, 11, 30),
    },
    {
        "key": "mule2",
        "account_number": "XXXX2003",
        "account_holder_name": "Deepak Yadav",
        "account_type": "savings",
        "ifsc_code": "SBIN0007799",
        "bank_name": "State Bank of India",
        "current_balance": "1800.00",
        "kyc_verified": False,
        "status": "under_review",
        "date_opened": (NOW - timedelta(days=11)).date(),
    },
]

# Victims funding the funnel, and the accounts it pays out to. These exist so
# the mule storyline never runs through the legitimate demo accounts.
for _i in range(1, 5):
    ACCOUNTS.append({
        "key": f"source_{_i}",
        "account_number": f"XXXX40{_i:02d}",
        "account_holder_name": f"Funding Source {_i}",
        "account_type": "savings",
        "ifsc_code": "KKBK000112" + str(_i),
        "bank_name": "Kotak Mahindra Bank",
        "current_balance": "22000.00",
        "kyc_verified": True,
        "status": "active",
        "date_opened": date(2021, 3, 5),
    })

for _i in range(1, 4):
    ACCOUNTS.append({
        "key": f"payout_{_i}",
        "account_number": f"XXXX50{_i:02d}",
        "account_holder_name": f"Payout Account {_i}",
        "account_type": "wallet",
        "ifsc_code": None,
        "bank_name": "QuickPay Wallet",
        "current_balance": "3100.00",
        "kyc_verified": False,
        "status": "active",
        "date_opened": (NOW - timedelta(days=25)).date(),
    })


def _txn(ref, sender, receiver, amount, ts, **kw) -> dict:
    row = {
        "ref": ref,
        "sender": sender,
        "receiver": receiver,
        "amount": amount,
        "ts": ts,
        "currency": "INR",
        "transaction_type": kw.get("kind", "transfer"),
        "channel": kw.get("channel", "UPI"),
        "status": kw.get("status", "completed"),
        "description": kw.get("note", "Transfer"),
        "device_id": kw.get("device_id", "DEV-STD"),
        "device_fingerprint": kw.get("fp", "FP-STD"),
        "ip_address": kw.get("ip", "198.51.100.20"),
        "location": kw.get("location", "Mumbai"),
        "merchant_category": kw.get("merchant"),
        "external_account_ref": kw.get("external"),
    }
    return row


def build_transactions() -> list[dict]:
    """The demo storyline, in one place."""
    rows: list[dict] = []

    # ---------------------------------------------------------------- normal
    # Salaried account: monthly salary in, rent and everyday spend out.
    for month in range(5, 0, -1):
        rows.append(_txn(
            f"sal-in-{month}", None, "salary", "95000.00",
            days(month * 30 + 1), kind="deposit", channel="NEFT",
            note="Monthly salary credit", external="EMP-PAYROLL-77",
            fp="FP-ANANYA", device_id="DEV-ANANYA",
        ))
        rows.append(_txn(
            f"sal-rent-{month}", "salary", "payee_a", "26000.00",
            days(month * 30), channel="NEFT", note="Monthly rent",
            fp="FP-ANANYA", device_id="DEV-ANANYA",
        ))

    for i, amount in enumerate(["1850.00", "640.00", "2300.00", "1120.00", "780.00"]):
        rows.append(_txn(
            f"sal-spend-{i}", "salary", "payee_b", amount,
            days(3 * i + 2), kind="payment", note="Everyday spend",
            merchant="retail", fp="FP-ANANYA", device_id="DEV-ANANYA",
        ))

    # A legitimate large payment: school fees, well within a known pattern.
    rows.append(_txn(
        "sal-fees", "salary", "payee_a", "26000.00", days(1),
        kind="payment", channel="NEFT", note="School fees",
        merchant="education", fp="FP-ANANYA", device_id="DEV-ANANYA",
    ))

    # -------------------------------------------------------------- business
    for i in range(20):
        rows.append(_txn(
            f"biz-in-{i}", None, "business", f"{45000 + i * 1500}.00",
            days(7 * i + 5), kind="deposit", channel="RTGS",
            note="Customer settlement", external=f"CUST-{2200 + i}",
            fp="FP-KIRAN", device_id="DEV-KIRAN", location="Pune",
        ))
        rows.append(_txn(
            f"biz-out-{i}", "business", "payee_a", f"{31000 + i * 900}.00",
            days(7 * i + 2), channel="RTGS", note="Supplier payment",
            fp="FP-KIRAN", device_id="DEV-KIRAN", location="Pune",
        ))

    # ------------------------------------------------------------------ mule
    # A young account that suddenly collects from many senders and pushes the
    # money straight back out, on a device shared with other accounts.
    collectors = ["source_1", "source_2", "source_3", "source_4"]

    for i, source in enumerate(collectors):
        # Each victim uses their own device: the funnel is the mule's doing,
        # not theirs.
        rows.append(_txn(
            f"mule-in-{i}", source, "mule", f"{62000 + i * 4000}.00",
            minutes(190 - i * 12), channel="IMPS", note="Incoming transfer",
            fp=f"FP-SRC-{i + 1}", device_id=f"DEV-SRC-{i + 1}",
            location="Mumbai",
        ))

    # Rapid pass-through: out again within minutes, split across payees, all
    # from the one handset that also drives the second mule account.
    payouts = ["payout_1", "payout_2", "payout_3", "payee_b"]

    for i, target in enumerate(payouts):
        rows.append(_txn(
            f"mule-out-{i}", "mule", target, f"{61000 + i * 3800}.00",
            minutes(120 - i * 14), channel="IMPS", note="Onward transfer",
            fp="FP-SHARED-9", device_id="DEV-SHARED-9", location="Delhi",
        ))

    # Device reuse: a second young account driven from the same handset.
    for i in range(3):
        rows.append(_txn(
            f"mule2-out-{i}", "mule2", "payout_1", f"{18000 + i * 2000}.00",
            minutes(150 - i * 20), channel="IMPS", note="Onward transfer",
            fp="FP-SHARED-9", device_id="DEV-SHARED-9", location="Delhi",
        ))

    # Splitting: several mid-sized legs that avoid any single-transaction rule.
    for i in range(5):
        rows.append(_txn(
            f"mule-split-{i}", "mule", "payee_b", "9800.00",
            minutes(58 - i * 9), note="Split transfer",
            fp="FP-SHARED-9", device_id="DEV-SHARED-9", location="Delhi",
        ))

    # A cluster of failed attempts - probing for a working route.
    for i in range(3):
        rows.append(_txn(
            f"mule-fail-{i}", "mule", "payee_a", "24000.00",
            minutes(40 - i * 6), status="failed", note="Failed transfer",
            fp="FP-SHARED-9", device_id="DEV-SHARED-9", location="Bengaluru",
        ))

    # --------------------------------------------------------------- dormant
    # Quiet for months, then a sudden high-value movement from a new city.
    rows.append(_txn(
        "dorm-old-1", None, "dormant", "3200.00", days(190),
        kind="deposit", channel="NEFT", note="Interest credit",
        external="BANK-INT", fp="FP-SUNIL", device_id="DEV-SUNIL",
    ))
    rows.append(_txn(
        "dorm-old-2", "dormant", "payee_a", "1500.00", days(185),
        note="Small transfer", fp="FP-SUNIL", device_id="DEV-SUNIL",
    ))
    rows.append(_txn(
        "dorm-wake", "dormant", "payout_2", "88000.00", minutes(300),
        channel="IMPS", note="Large transfer after long inactivity",
        fp="FP-NEW-DEVICE", device_id="DEV-NEW-1", location="Hyderabad",
        ip="203.0.113.44",
    ))

    return rows


def already_seeded(session, ref: str) -> bool:
    marker = f"%[{SEED_TAG}:{ref}]%"

    return session.scalar(
        select(Transaction.transaction_id).where(
            Transaction.description.like(marker)
        )
    ) is not None


def reset(session) -> None:
    """Clear analysis artefacts and transactions for a clean demonstration."""
    alerts = session.query(FraudAlert).delete()
    scores = session.query(RiskScore).delete()
    txns = session.query(Transaction).delete()
    session.commit()

    print(f"  reset: removed {alerts} alerts, {scores} risk scores, "
          f"{txns} transactions")


def ensure_accounts(session) -> dict[str, int]:
    """Create demo accounts if absent; return key -> account_id."""
    mapping: dict[str, int] = {}

    for spec in ACCOUNTS:
        key = spec["key"]

        existing = (
            session.query(Account)
            .filter(Account.account_number == spec["account_number"])
            .first()
        )

        if existing is None:
            account = Account(
                account_number=spec["account_number"],
                account_holder_name=spec["account_holder_name"],
                account_type=spec["account_type"],
                ifsc_code=spec["ifsc_code"],
                bank_name=spec["bank_name"],
                current_balance=Decimal(spec["current_balance"]),
                kyc_verified=spec["kyc_verified"],
                status=spec["status"],
                date_opened=spec["date_opened"],
            )
            session.add(account)
            session.flush()
            existing = account
            print(f"  account created: {spec['account_number']} "
                  f"({spec['account_holder_name']})")

        mapping[key] = existing.account_id

    session.commit()
    return mapping


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed VittaPala demo data")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="delete existing transactions, risk scores and alerts first",
    )
    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)

    session = SessionLocal()
    inserted = skipped = 0

    try:
        print("Seeding VittaPala demo data...")

        if args.reset:
            reset(session)

        accounts = ensure_accounts(session)

        for row in build_transactions():
            if not args.reset and already_seeded(session, row["ref"]):
                skipped += 1
                continue

            sender = accounts.get(row["sender"]) if row["sender"] else None
            receiver = accounts.get(row["receiver"]) if row["receiver"] else None

            session.add(Transaction(
                sender_account_id=sender,
                receiver_account_id=receiver,
                external_account_ref=row["external_account_ref"],
                amount=Decimal(row["amount"]),
                currency=row["currency"],
                transaction_type=row["transaction_type"],
                channel=row["channel"],
                status=row["status"],
                transaction_timestamp=row["ts"],
                description=f'{row["description"]} [{SEED_TAG}:{row["ref"]}]',
                device_id=row["device_id"],
                device_fingerprint=row["device_fingerprint"],
                ip_address=row["ip_address"],
                location=row["location"],
                merchant_category=row["merchant_category"],
            ))
            inserted += 1

        session.commit()

        print(f"\nDone. {inserted} transactions inserted, {skipped} skipped.")
        print(f"Accounts: {len(accounts)}")
        print("\nSuggested demo flow:")
        print(f"  1. Analyse a mule transfer   : account {accounts['mule']}")
        print(f"  2. Compare a salaried account: account {accounts['salary']}")
        print(f"  3. Dormant reactivation      : account {accounts['dormant']}")
        print(f"  4. Device-reuse partner      : account {accounts['mule2']}")
        return 0

    except Exception as exc:  # pragma: no cover - operational script
        session.rollback()
        print(f"Seeding failed: {exc}", file=sys.stderr)
        return 1

    finally:
        session.close()


if __name__ == "__main__":
    raise SystemExit(main())
