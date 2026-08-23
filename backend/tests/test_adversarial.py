"""
Adversarial scenario suite.

Each scenario is a realistic behaviour - legitimate, suspicious, or a
deliberate evasion attempt - expressed as the context the engine actually
consumes. Expectations are bands (minimum and/or maximum risk level), not
exact scores, so that tuning a threshold does not silently invalidate the
intent of a test.

The rule is: if a scenario fails, fix the engine, not the expectation.
"""
from datetime import datetime, timedelta
from decimal import Decimal

import pytest

from app.risk.contracts import AccountData, RiskContext, RiskLevel, TransactionData
from app.risk.engines.rule_based import RuleBasedRiskEngine

ACCOUNT_ID = 1
NOW = datetime(2026, 8, 22, 15, 0)

LEVEL_RANK = {
    RiskLevel.LOW: 0,
    RiskLevel.MEDIUM: 1,
    RiskLevel.HIGH: 2,
    RiskLevel.CRITICAL: 3,
}


def txn(
    tid,
    amount,
    minutes_ago=0,
    sender=ACCOUNT_ID,
    receiver=2,
    fingerprint="FP-1",
    location="Mumbai",
    status="completed",
    kind="transfer",
):
    return TransactionData(
        transaction_id=tid,
        amount=Decimal(str(amount)),
        channel="UPI",
        transaction_timestamp=NOW - timedelta(minutes=minutes_ago),
        device_fingerprint=fingerprint,
        device_id="DEVICE-1",
        ip_address="10.0.0.1",
        location=location,
        transaction_type=kind,
        status=status,
        merchant_category=None,
        sender_account_id=sender,
        receiver_account_id=receiver,
    )


def days(n):
    """Minutes-ago value for n days ago."""
    return int(n * 24 * 60)


def scenario(
    current,
    history,
    opened_days_ago=800,
    prior_count=120,
    prior_total=900_000.0,
    device_accounts=(ACCOUNT_ID,),
    known_devices=("FP-1",),
    known_locations=("Mumbai",),
    quiet_days=1.0,
):
    """
    Build the context exactly as build_risk_context() would.

    prior_* describe the 30-180 day window, which is the anchor an attacker
    cannot rewrite with today's activity.
    """
    prior_average = (prior_total / prior_count) if prior_count else None

    known_receivers = sorted(
        {t.receiver_account_id for t in history if t.sender_account_id == ACCOUNT_ID}
        | ({current.receiver_account_id}
           if current.sender_account_id == ACCOUNT_ID
           and current.receiver_account_id is not None else set())
    )
    known_senders = sorted(
        {t.sender_account_id for t in history if t.receiver_account_id == ACCOUNT_ID}
        | ({current.sender_account_id}
           if current.receiver_account_id == ACCOUNT_ID
           and current.sender_account_id is not None else set())
    )

    return RiskContext(
        transaction=current,
        account=AccountData(
            account_id=ACCOUNT_ID,
            kyc_verified=True,
            date_opened=(NOW - timedelta(days=opened_days_ago)).date(),
        ),
        recent_transactions=history,
        related_data={
            "known_devices": list(known_devices),
            "known_locations": list(known_locations),
            "known_receivers": known_receivers,
            "known_senders": known_senders,
            "prior_activity_count": prior_count,
            "prior_activity_total": prior_total,
            "prior_activity_average": prior_average,
            "prior_activity_days": 180,
            "days_since_previous_activity": quiet_days,
            "device_fingerprint": current.device_fingerprint,
            "device_account_ids": list(device_accounts),
            "device_account_count": len(device_accounts),
            "device_lookback_days": 90,
        },
    )


# --------------------------------------------------------------------------- #
# Scenario definitions
# --------------------------------------------------------------------------- #


def s01_salary_account():
    """Salaried person paying the same rent they pay every month."""
    history = [
        txn(10, 50000, days(29), sender=900, receiver=ACCOUNT_ID),
        txn(11, 15000, days(28), receiver=500),
        txn(12, 2000, days(25)),
        txn(13, 1800, days(20)),
        txn(14, 2200, days(14)),
        txn(15, 1500, days(9)),
        txn(16, 50000, days(1), sender=900, receiver=ACCOUNT_ID),
    ]
    return scenario(txn(1, 15000, 0, receiver=500), history)


def s02_one_legitimate_large_payment():
    """Established account makes a single large, well-supported payment."""
    history = [txn(100 + i, 4000 + (i * 250), days(2 * i + 1)) for i in range(10)]
    return scenario(txn(1, 45000, 0, receiver=700), history)


def s03_occasional_transfers():
    """Ordinary low-volume account."""
    history = [txn(100 + i, 2500, days(3 * i + 2)) for i in range(6)]
    return scenario(txn(1, 3000, 0), history)


def s04_household_shared_device():
    """Two family members on one handset, both behaving normally."""
    history = [txn(100 + i, 2000, days(3 * i + 1)) for i in range(6)]
    return scenario(
        txn(1, 2500, 0), history, device_accounts=(ACCOUNT_ID, 2),
    )


def s05_new_account_large_transfer():
    """Account opened three days ago immediately moves a large sum."""
    history = [txn(100 + i, 1000, days(i) + 60) for i in range(1, 4)]
    return scenario(
        txn(1, 80000, 0, receiver=600),
        history,
        opened_days_ago=3,
        prior_count=0,
        prior_total=0.0,
    )


def s06_large_against_baseline():
    """Well-established small-spend account suddenly moves 40x its norm."""
    history = [txn(100 + i, 1500, days(2 * i + 1)) for i in range(10)]
    return scenario(txn(1, 60000, 0, receiver=610), history)


def s07_many_small_collectively_large():
    """Twelve mid-sized legs that add up to a large movement."""
    history = [txn(100 + i, 1200, days(3 * i + 2)) for i in range(6)]
    history += [txn(200 + i, 9000, 100 * (i + 1), receiver=620 + i) for i in range(11)]
    return scenario(txn(1, 9000, 0, receiver=640), history)


def s08_rapid_receive_send():
    """Money in, straight back out four minutes later."""
    history = [txn(100 + i, 2000, days(3 * i + 2)) for i in range(5)]
    history += [txn(300, 90000, 4, sender=800, receiver=ACCOUNT_ID)]
    return scenario(txn(1, 88000, 0, receiver=801), history)


def s09_high_pass_through():
    """Several inflows, nearly all forwarded within the day."""
    history = [txn(100 + i, 2000, days(3 * i + 2)) for i in range(5)]
    history += [
        txn(300 + i, 30000, 400 - (30 * i), sender=810 + i, receiver=ACCOUNT_ID)
        for i in range(3)
    ]
    history += [txn(320, 45000, 200, receiver=820)]
    return scenario(txn(1, 42000, 0, receiver=821), history)


def s10_many_counterparties():
    """Eight distinct receivers inside a day."""
    history = [txn(100 + i, 1500, days(3 * i + 2)) for i in range(5)]
    history += [txn(200 + i, 7000, 90 * (i + 1), receiver=700 + i) for i in range(7)]
    return scenario(txn(1, 7000, 0, receiver=720), history)


def s11_dormant_becomes_active():
    """Quiet for months, then a burst of high-value movement."""
    history = [txn(200 + i, 30000, 120 * (i + 1), receiver=730 + i) for i in range(4)]
    return scenario(
        txn(1, 35000, 0, receiver=740),
        history,
        opened_days_ago=900,
        prior_count=1,
        prior_total=2000.0,
        quiet_days=160.0,
    )


def s12_device_across_suspicious_accounts():
    """One handset driving five accounts, alongside real movement."""
    history = [txn(100 + i, 1500, days(2 * i + 2)) for i in range(6)]
    history += [txn(200 + i, 20000, 120 * (i + 1), receiver=750 + i) for i in range(3)]
    return scenario(
        txn(1, 20000, 0, receiver=760),
        history,
        device_accounts=(ACCOUNT_ID, 2, 3, 4, 5),
    )


def s13_gradual_escalation():
    """1k -> 2k -> 5k -> 15k -> 30k across nine days."""
    steps = [1000, 2000, 5000, 15000]
    history = [
        txn(100 + i, amount, days(9 - 2 * i))
        for i, amount in enumerate(steps)
    ]
    # A small account: its real history averages ~1,000, which is the whole
    # premise of "escalation". Leaving the default 7,500 average here would
    # have described an account whose baseline was falling, not rising.
    return scenario(
        txn(1, 30000, 0, receiver=770),
        history,
        prior_count=30,
        prior_total=30_000.0,
    )


def s14_multi_account_movement():
    """Collect from many, then push out to many - a funnel."""
    history = [txn(100 + i, 1500, days(3 * i + 2)) for i in range(4)]
    history += [
        txn(200 + i, 25000, 600 - (40 * i), sender=830 + i, receiver=ACCOUNT_ID)
        for i in range(5)
    ]
    history += [txn(300 + i, 24000, 300 - (40 * i), receiver=840 + i) for i in range(4)]
    return scenario(txn(1, 24000, 0, receiver=849), history)


def s15_many_signals_together():
    """Fresh device, new city, rapid pass-through, high velocity."""
    history = [txn(100 + i, 1500, days(2 * i + 2)) for i in range(5)]
    history += [txn(300, 95000, 6, sender=850, receiver=ACCOUNT_ID)]
    history += [
        txn(310 + i, 30000, 30 * (i + 1), receiver=860 + i, location="Pune")
        for i in range(3)
    ]
    return scenario(
        txn(1, 60000, 0, receiver=870, fingerprint="FP-NEW", location="Goa"),
        history,
        device_accounts=(ACCOUNT_ID, 2, 3, 4),
    )


def s16_transaction_splitting():
    """50,000 split into five legs, each above the structuring ceiling."""
    history = [txn(100 + i, 1000, days(3 * i + 2)) for i in range(6)]
    history += [txn(200 + i, 10000, 90 * (i + 1), receiver=880 + i) for i in range(4)]
    return scenario(txn(1, 10000, 0, receiver=884), history)


def s17_baseline_manipulation():
    """Prime the median with twenty 20k transfers, then move 50,000."""
    history = [txn(100 + i, 20000, 360 * (i + 1), receiver=2) for i in range(20)]
    # The priming sits inside the recent window. The account's real history is
    # modest, and that is what the priming is trying to paper over.
    return scenario(
        txn(1, 50000, 0, receiver=890),
        history,
        prior_count=30,
        prior_total=30_000.0,
    )


def s18_waited_out_new_account_window():
    """Account is 45 days old: past NEW_ACCOUNT, and moving real money."""
    history = [txn(100 + i, 1500, days(2 * i + 2)) for i in range(5)]
    history += [txn(200 + i, 15000, 150 * (i + 1), receiver=900 + i) for i in range(3)]
    return scenario(
        txn(1, 15000, 0, receiver=910),
        history,
        opened_days_ago=45,
        prior_count=6,
        prior_total=9000.0,
    )


def s19_all_below_large_threshold():
    """Every leg deliberately small; only the total is remarkable."""
    history = [txn(100 + i, 1000, days(3 * i + 2)) for i in range(5)]
    history += [txn(200 + i, 4500, 60 * (i + 1), receiver=920 + i) for i in range(11)]
    return scenario(txn(1, 4500, 0, receiver=935), history)


def s20_many_small_counterparties():
    """Ten small payouts to ten different accounts."""
    history = [txn(100 + i, 1200, days(3 * i + 2)) for i in range(5)]
    history += [txn(200 + i, 5000, 80 * (i + 1), receiver=940 + i) for i in range(9)]
    return scenario(txn(1, 5000, 0, receiver=950), history)


# id, label, factory, min level, max level, rules that must appear
SCENARIOS = [
    ("01", "Normal salary account, recurring rent",
     s01_salary_account, None, RiskLevel.MEDIUM, ()),
    ("02", "Normal account, one legitimate large payment",
     s02_one_legitimate_large_payment, None, RiskLevel.MEDIUM, ()),
    ("03", "Normal account, occasional transfers",
     s03_occasional_transfers, None, RiskLevel.LOW, ()),
    ("04", "Shared household device, normal behaviour",
     s04_household_shared_device, None, RiskLevel.LOW, ()),

    ("05", "Brand-new account + large transfer",
     s05_new_account_large_transfer, RiskLevel.MEDIUM, None, ("NEW_ACCOUNT",)),
    ("06", "Large transaction relative to baseline",
     s06_large_against_baseline, RiskLevel.MEDIUM, None, ("LARGE_TRANSACTION",)),
    ("07", "Many small transfers, collectively large",
     s07_many_small_collectively_large, RiskLevel.HIGH, None, ("VOLUME_SPIKE",)),
    ("08", "Rapid receive -> send",
     s08_rapid_receive_send, RiskLevel.HIGH, None, ("RAPID_MOVEMENT",)),
    ("09", "High pass-through ratio",
     s09_high_pass_through, RiskLevel.HIGH, None, ("PASS_THROUGH",)),
    ("10", "Many counterparties in a short period",
     s10_many_counterparties, RiskLevel.HIGH, None, ("FAN_OUT",)),
    ("11", "Dormant account becomes highly active",
     s11_dormant_becomes_active, RiskLevel.MEDIUM, None, ("DORMANT_ACTIVATION",)),
    ("12", "Device reused across five accounts + movement",
     s12_device_across_suspicious_accounts, RiskLevel.HIGH, None, ("DEVICE_REUSE",)),
    ("13", "Gradual transaction escalation",
     s13_gradual_escalation, RiskLevel.MEDIUM, None, ()),
    ("14", "Multi-account funnel (collect then distribute)",
     s14_multi_account_movement, RiskLevel.HIGH, None, ("FAN_IN", "FAN_OUT")),
    ("15", "Many suspicious signals together",
     s15_many_signals_together, RiskLevel.CRITICAL, None, ()),

    ("16", "EVASION: transaction splitting",
     s16_transaction_splitting, RiskLevel.HIGH, None, ("VOLUME_SPIKE",)),
    ("17", "EVASION: baseline manipulation",
     s17_baseline_manipulation, RiskLevel.HIGH, None, ("BASELINE_SHIFT",)),
    ("18", "EVASION: waited out the new-account window",
     s18_waited_out_new_account_window, RiskLevel.MEDIUM, None, ()),
    ("19", "EVASION: every leg below the large-txn threshold",
     s19_all_below_large_threshold, RiskLevel.HIGH, None, ("VOLUME_SPIKE",)),
    ("20", "EVASION: many small counterparties",
     s20_many_small_counterparties, RiskLevel.HIGH, None, ("FAN_OUT",)),
]


def run(factory):
    return RuleBasedRiskEngine().analyze(factory())


@pytest.mark.parametrize(
    "sid,label,factory,min_level,max_level,required",
    SCENARIOS,
    ids=[f"{s[0]}-{s[1][:40]}" for s in SCENARIOS],
)
def test_adversarial_scenario(sid, label, factory, min_level, max_level, required):
    result = run(factory)
    codes = [p.code for p in result.detected_patterns]

    if min_level is not None:
        assert LEVEL_RANK[result.risk_level] >= LEVEL_RANK[min_level], (
            f"{sid} {label}: expected at least {min_level.value}, "
            f"got {result.risk_level.value} ({result.risk_score}) "
            f"with {codes}"
        )

    if max_level is not None:
        assert LEVEL_RANK[result.risk_level] <= LEVEL_RANK[max_level], (
            f"{sid} {label}: expected at most {max_level.value}, "
            f"got {result.risk_level.value} ({result.risk_score}) "
            f"with {codes}"
        )

    for rule in required:
        assert rule in codes, (
            f"{sid} {label}: expected {rule} to fire, got {codes}"
        )


def test_every_finding_is_explainable():
    """No scenario may produce a score without evidence behind it."""
    for sid, label, factory, _min, _max, _req in SCENARIOS:
        result = run(factory)

        for pattern in result.detected_patterns:
            assert pattern.rule_name, f"{sid}: {pattern.code} has no name"
            assert pattern.evidence, f"{sid}: {pattern.code} has no evidence"
            assert len(pattern.description) > 30, f"{sid}: {pattern.code} terse"

        if result.risk_score > 0:
            assert result.detected_patterns, (
                f"{sid} {label}: scored {result.risk_score} with no findings"
            )


def test_context_alone_never_reaches_high():
    """
    New account + shared device + new city + new payee, with entirely ordinary
    money movement, must not be treated as high risk. This is the false
    positive that made a legitimate customer critical before hardening.
    """
    history = [txn(100 + i, 2000, days(3 * i + 2)) for i in range(6)]

    context = scenario(
        txn(1, 2400, 0, receiver=999, fingerprint="FP-NEW", location="Delhi"),
        history,
        opened_days_ago=2,
        prior_count=0,
        prior_total=0.0,
        device_accounts=(ACCOUNT_ID, 2, 3),
    )

    result = RuleBasedRiskEngine().analyze(context)
    tiers = result.explanation["tier_breakdown"]

    assert tiers["behavioural_total"] == 0.0
    assert result.risk_level in (RiskLevel.LOW, RiskLevel.MEDIUM)
