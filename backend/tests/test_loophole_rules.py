from datetime import datetime, timedelta
from decimal import Decimal

from app.risk.contracts import (
    AccountData,
    RiskContext,
    RiskLevel,
    TransactionData,
)
from app.risk.engines.rule_based import RuleBasedRiskEngine


# The account under analysis in every scenario below.
ACCOUNT_ID = 1

BASE_TS = datetime(2026, 8, 22, 15, 0)


def make_transaction(
    transaction_id=1,
    amount="1000.00",
    timestamp=None,
    device_fingerprint="FP-001",
    sender_account_id=ACCOUNT_ID,
    receiver_account_id=2,
    location="Mumbai",
    status="completed",
    transaction_type="transfer",
):
    return TransactionData(
        transaction_id=transaction_id,
        amount=Decimal(amount),
        channel="UPI",
        transaction_timestamp=timestamp or BASE_TS,
        device_fingerprint=device_fingerprint,
        device_id="DEVICE-001",
        ip_address="192.168.1.10",
        location=location,
        transaction_type=transaction_type,
        status=status,
        merchant_category=None,
        sender_account_id=sender_account_id,
        receiver_account_id=receiver_account_id,
    )


def make_context(
    transaction,
    history=None,
    account_opened=datetime(2025, 1, 1).date(),
    related_data=None,
):
    """
    Defaults keep every "first seen" rule quiet, so each test isolates the
    behaviour it is actually about.
    """
    account = AccountData(
        account_id=ACCOUNT_ID,
        kyc_verified=True,
        date_opened=account_opened,
    )

    if related_data is None:
        related_data = {
            "known_devices": ["FP-001"],
            "known_locations": ["Mumbai"],
            "known_receivers": [2],
            "known_senders": [2],
            "prior_activity_count": 40,
        }

    return RiskContext(
        transaction=transaction,
        account=account,
        recent_transactions=history or [],
        related_data=related_data,
    )


def codes(result):
    return [pattern.code for pattern in result.detected_patterns]


def analyze(context):
    return RuleBasedRiskEngine().analyze(context)


# --------------------------------------------------------------------------- #
# Baseline: ordinary behaviour must stay quiet
# --------------------------------------------------------------------------- #


def test_normal_behaviour_does_not_produce_excessive_alerts():
    # Eight ordinary payments spread across a month, same device, same city,
    # same known payee.
    history = [
        make_transaction(
            transaction_id=100 + i,
            amount="1800.00",
            timestamp=BASE_TS - timedelta(days=3 * i),
        )
        for i in range(1, 9)
    ]

    transaction = make_transaction(amount="1500.00")

    result = analyze(make_context(transaction, history=history))

    assert result.risk_level == RiskLevel.LOW
    assert result.detected_patterns == []
    assert result.risk_score == 0.0


def test_empty_history_does_not_crash():
    transaction = make_transaction(amount="1000.00")

    # No history and no derived features at all.
    result = analyze(
        make_context(transaction, history=[], related_data={})
    )

    assert result.risk_level == RiskLevel.LOW
    assert result.risk_score == 0.0
    assert result.explanation["reasons"]


def test_single_transaction_history_does_not_crash():
    history = [
        make_transaction(
            transaction_id=2,
            timestamp=BASE_TS - timedelta(days=1),
        )
    ]

    result = analyze(
        make_context(make_transaction(), history=history, related_data={})
    )

    assert result.risk_score >= 0.0


# --------------------------------------------------------------------------- #
# Rapid movement / pass-through
# --------------------------------------------------------------------------- #


def test_rapid_pass_through_behaviour_is_detected():
    # 50,000 arrives, 48,000 leaves five minutes later.
    history = [
        make_transaction(
            transaction_id=2,
            amount="50000.00",
            timestamp=BASE_TS - timedelta(minutes=5),
            sender_account_id=55,
            receiver_account_id=ACCOUNT_ID,
        )
    ]

    transaction = make_transaction(
        amount="48000.00",
        receiver_account_id=99,
    )

    related_data = {
        "known_devices": ["FP-001"],
        "known_locations": ["Mumbai"],
        "known_receivers": [99],
        "known_senders": [55],
        "prior_activity_count": 40,
    }

    result = analyze(
        make_context(transaction, history=history, related_data=related_data)
    )

    assert "RAPID_MOVEMENT" in codes(result)
    assert "PASS_THROUGH" in codes(result)
    assert result.risk_level != RiskLevel.LOW

    rapid = next(
        p for p in result.detected_patterns if p.code == "RAPID_MOVEMENT"
    )

    # The finding must point at both legs of the hop.
    assert rapid.evidence["minutes_between"] == 5.0
    assert rapid.evidence["forwarded_ratio"] == 0.96
    assert sorted(rapid.transaction_ids) == [1, 2]


def test_funds_held_instead_of_forwarded_is_not_rapid_movement():
    # Same inflow, but only a small fraction leaves.
    history = [
        make_transaction(
            transaction_id=2,
            amount="50000.00",
            timestamp=BASE_TS - timedelta(minutes=5),
            sender_account_id=55,
            receiver_account_id=ACCOUNT_ID,
        )
    ]

    transaction = make_transaction(amount="900.00")

    result = analyze(make_context(transaction, history=history))

    assert "RAPID_MOVEMENT" not in codes(result)
    assert "PASS_THROUGH" not in codes(result)


# --------------------------------------------------------------------------- #
# Velocity
# --------------------------------------------------------------------------- #


def test_high_transaction_velocity_is_detected():
    # Six transfers inside ten minutes.
    history = [
        make_transaction(
            transaction_id=200 + i,
            amount="2000.00",
            timestamp=BASE_TS - timedelta(minutes=2 * i),
        )
        for i in range(1, 6)
    ]

    transaction = make_transaction(amount="2000.00")

    result = analyze(make_context(transaction, history=history))

    assert "HIGH_VELOCITY" in codes(result)
    assert "BURST_ACTIVITY" in codes(result)

    burst = next(
        p for p in result.detected_patterns if p.code == "BURST_ACTIVITY"
    )

    assert burst.evidence["count_in_window"] == 6


def test_velocity_rules_share_a_family_and_are_not_double_counted():
    history = [
        make_transaction(
            transaction_id=200 + i,
            amount="2000.00",
            timestamp=BASE_TS - timedelta(minutes=2 * i),
        )
        for i in range(1, 6)
    ]

    result = analyze(
        make_context(make_transaction(amount="2000.00"), history=history)
    )

    velocity_hits = [
        p for p in result.detected_patterns
        if p.code in ("HIGH_VELOCITY", "BURST_ACTIVITY")
    ]

    raw_sum = sum(p.score_contribution for p in velocity_hits)

    # Both rules read the same evidence, so the family must score for less
    # than the two contributions added together.
    assert len(velocity_hits) == 2
    assert result.explanation["family_breakdown"]["velocity"] < raw_sum


# --------------------------------------------------------------------------- #
# Many-to-one and one-to-many
# --------------------------------------------------------------------------- #


def test_one_to_many_distribution_is_detected():
    # Six different receivers over a day.
    history = [
        make_transaction(
            transaction_id=300 + i,
            amount="12000.00",
            timestamp=BASE_TS - timedelta(hours=2 * i),
            receiver_account_id=100 + i,
        )
        for i in range(1, 6)
    ]

    transaction = make_transaction(
        amount="12000.00",
        receiver_account_id=100,
    )

    related_data = {
        "known_devices": ["FP-001"],
        "known_locations": ["Mumbai"],
        "known_receivers": [100, 101, 102, 103, 104, 105],
        "known_senders": [2],
        "prior_activity_count": 40,
    }

    result = analyze(
        make_context(transaction, history=history, related_data=related_data)
    )

    assert "FAN_OUT" in codes(result)

    fan_out = next(p for p in result.detected_patterns if p.code == "FAN_OUT")

    assert fan_out.evidence["distinct_receivers"] == 6
    assert fan_out.evidence["receiver_account_ids"] == [100, 101, 102, 103, 104, 105]


def test_many_to_one_collection_is_detected():
    # Six different senders paying in over a day.
    history = [
        make_transaction(
            transaction_id=400 + i,
            amount="12000.00",
            timestamp=BASE_TS - timedelta(hours=2 * i),
            sender_account_id=200 + i,
            receiver_account_id=ACCOUNT_ID,
        )
        for i in range(1, 6)
    ]

    transaction = make_transaction(
        amount="12000.00",
        sender_account_id=200,
        receiver_account_id=ACCOUNT_ID,
    )

    related_data = {
        "known_devices": ["FP-001"],
        "known_locations": ["Mumbai"],
        "known_receivers": [2],
        "known_senders": [200, 201, 202, 203, 204, 205],
        "prior_activity_count": 40,
    }

    result = analyze(
        make_context(transaction, history=history, related_data=related_data)
    )

    assert "FAN_IN" in codes(result)

    fan_in = next(p for p in result.detected_patterns if p.code == "FAN_IN")

    assert fan_in.evidence["distinct_senders"] == 6
    assert fan_in.evidence["total_inflow"] == 72000.0


# --------------------------------------------------------------------------- #
# Circular flow
# --------------------------------------------------------------------------- #


def test_circular_flow_with_same_counterparty_is_detected():
    # Money bounces back and forth with account 42.
    history = [
        make_transaction(
            transaction_id=501,
            amount="20000.00",
            timestamp=BASE_TS - timedelta(hours=6),
            sender_account_id=42,
            receiver_account_id=ACCOUNT_ID,
        ),
        make_transaction(
            transaction_id=502,
            amount="19000.00",
            timestamp=BASE_TS - timedelta(hours=5),
            receiver_account_id=42,
        ),
        make_transaction(
            transaction_id=503,
            amount="18000.00",
            timestamp=BASE_TS - timedelta(hours=4),
            sender_account_id=42,
            receiver_account_id=ACCOUNT_ID,
        ),
    ]

    transaction = make_transaction(
        amount="17000.00",
        receiver_account_id=42,
    )

    related_data = {
        "known_devices": ["FP-001"],
        "known_locations": ["Mumbai"],
        "known_receivers": [42],
        "known_senders": [42],
        "prior_activity_count": 40,
    }

    result = analyze(
        make_context(transaction, history=history, related_data=related_data)
    )

    assert "CIRCULAR_FLOW" in codes(result)

    circular = next(
        p for p in result.detected_patterns if p.code == "CIRCULAR_FLOW"
    )

    assert circular.evidence["counterparty_account_ids"] == [42]
    assert circular.evidence["leg_count"] == 4


# --------------------------------------------------------------------------- #
# Device reuse
# --------------------------------------------------------------------------- #


def test_device_reuse_is_treated_as_a_signal_not_proof():
    related_data = {
        "known_devices": ["FP-001"],
        "known_locations": ["Mumbai"],
        "known_receivers": [2],
        "known_senders": [2],
        "prior_activity_count": 40,
        "device_fingerprint": "FP-001",
        "device_account_ids": [1, 7, 9],
        "device_account_count": 3,
        "device_lookback_days": 90,
    }

    result = analyze(
        make_context(make_transaction(), related_data=related_data)
    )

    assert "DEVICE_REUSE" in codes(result)

    reuse = next(p for p in result.detected_patterns if p.code == "DEVICE_REUSE")

    # A shared device on its own must not push the account to the top band.
    assert reuse.severity == RiskLevel.MEDIUM
    assert result.risk_level in (RiskLevel.LOW, RiskLevel.MEDIUM)

    assert reuse.evidence["signal_only"] is True
    assert reuse.evidence["other_account_ids"] == [7, 9]
    assert "signal rather than proof" in reuse.description


def test_device_used_by_one_account_is_not_flagged():
    related_data = {
        "known_devices": ["FP-001"],
        "known_locations": ["Mumbai"],
        "known_receivers": [2],
        "known_senders": [2],
        "prior_activity_count": 40,
        "device_account_ids": [ACCOUNT_ID],
    }

    result = analyze(
        make_context(make_transaction(), related_data=related_data)
    )

    assert "DEVICE_REUSE" not in codes(result)


# --------------------------------------------------------------------------- #
# Location, failures, dormancy
# --------------------------------------------------------------------------- #


def test_location_switching_is_detected_without_claiming_impossible_travel():
    history = [
        make_transaction(
            transaction_id=601,
            timestamp=BASE_TS - timedelta(hours=1),
            location="Delhi",
        )
    ]

    result = analyze(
        make_context(make_transaction(location="Mumbai"), history=history)
    )

    assert "LOCATION_ANOMALY" in codes(result)

    anomaly = next(
        p for p in result.detected_patterns if p.code == "LOCATION_ANOMALY"
    )

    assert anomaly.evidence["coordinates_available"] is False
    assert anomaly.evidence["locations"] == ["Delhi", "Mumbai"]


def test_failed_transaction_cluster_is_detected():
    history = [
        make_transaction(
            transaction_id=700 + i,
            timestamp=BASE_TS - timedelta(hours=i),
            status="failed" if i <= 3 else "completed",
        )
        for i in range(1, 6)
    ]

    result = analyze(make_context(make_transaction(), history=history))

    assert "FAILED_BURST" in codes(result)

    failed = next(
        p for p in result.detected_patterns if p.code == "FAILED_BURST"
    )

    assert failed.evidence["failed_count"] == 3
    assert failed.evidence["total_in_window"] == 6


def test_dormant_account_activation_is_detected():
    related_data = {
        "known_devices": ["FP-001"],
        "known_locations": ["Mumbai"],
        "known_receivers": [2],
        "known_senders": [2],
        "prior_activity_count": 1,
        "prior_activity_days": 180,
        "days_since_previous_activity": 150.0,
    }

    transaction = make_transaction(amount="40000.00")

    result = analyze(
        make_context(transaction, related_data=related_data)
    )

    assert "DORMANT_ACTIVATION" in codes(result)

    dormant = next(
        p for p in result.detected_patterns if p.code == "DORMANT_ACTIVATION"
    )

    assert dormant.evidence["triggered_by_value"] is True
    assert dormant.evidence["prior_activity_count"] == 1


def test_dormancy_stays_silent_when_builder_supplies_no_history_aggregate():
    # related_data without prior_activity_count: the rule cannot know.
    result = analyze(
        make_context(make_transaction(amount="40000.00"), related_data={})
    )

    assert "DORMANT_ACTIVATION" not in codes(result)


# --------------------------------------------------------------------------- #
# Score combination
# --------------------------------------------------------------------------- #


def test_multiple_weak_signals_combine_into_elevated_risk():
    # New device, new city and a never-used receiver, all at once.
    history = [
        make_transaction(
            transaction_id=801,
            timestamp=BASE_TS - timedelta(hours=1),
            location="Mumbai",
        )
    ]

    transaction = make_transaction(
        device_fingerprint="FP-UNKNOWN",
        location="Pune",
        receiver_account_id=77,
    )

    result = analyze(make_context(transaction, history=history))

    assert len(result.detected_patterns) >= 3

    strongest = max(p.score_contribution for p in result.detected_patterns)

    # Independent families stack, so the combined score must exceed any
    # single rule's contribution.
    assert result.risk_score > strongest
    assert result.risk_level in (
        RiskLevel.MEDIUM,
        RiskLevel.HIGH,
        RiskLevel.CRITICAL,
    )


def test_duplicate_transactions_do_not_inflate_the_score():
    history = [
        make_transaction(
            transaction_id=200 + i,
            amount="2000.00",
            timestamp=BASE_TS - timedelta(minutes=2 * i),
        )
        for i in range(1, 6)
    ]

    transaction = make_transaction(amount="2000.00")

    clean = analyze(make_context(transaction, history=history))

    # The same rows delivered three times over.
    duplicated = analyze(
        make_context(transaction, history=history * 3)
    )

    assert duplicated.risk_score == clean.risk_score
    assert codes(duplicated) == codes(clean)

    for pattern in duplicated.detected_patterns:
        assert len(pattern.transaction_ids) == len(set(pattern.transaction_ids))


def test_history_containing_the_scored_transaction_is_ignored():
    transaction = make_transaction(amount="2000.00")

    history = [
        make_transaction(
            transaction_id=200 + i,
            amount="2000.00",
            timestamp=BASE_TS - timedelta(minutes=2 * i),
        )
        for i in range(1, 6)
    ]

    with_self = analyze(
        make_context(transaction, history=history + [transaction])
    )

    without_self = analyze(make_context(transaction, history=history))

    assert with_self.risk_score == without_self.risk_score


def test_scoring_is_deterministic():
    history = [
        make_transaction(
            transaction_id=300 + i,
            amount="12000.00",
            timestamp=BASE_TS - timedelta(hours=2 * i),
            receiver_account_id=100 + i,
        )
        for i in range(1, 6)
    ]

    transaction = make_transaction(amount="12000.00", receiver_account_id=100)

    first = analyze(make_context(transaction, history=history))
    second = analyze(make_context(transaction, history=history))

    assert first.model_dump() == second.model_dump()


def test_risk_score_never_exceeds_the_scale():
    # Pile on every signal at once.
    history = [
        make_transaction(
            transaction_id=900 + i,
            amount="9000.00",
            timestamp=BASE_TS - timedelta(minutes=i),
            receiver_account_id=500 + i,
            location="City-%d" % i,
            device_fingerprint="FP-%d" % i,
        )
        for i in range(1, 12)
    ]

    history.append(
        make_transaction(
            transaction_id=999,
            amount="80000.00",
            timestamp=BASE_TS - timedelta(minutes=2),
            sender_account_id=42,
            receiver_account_id=ACCOUNT_ID,
        )
    )

    transaction = make_transaction(
        amount="79000.00",
        receiver_account_id=42,
        device_fingerprint="FP-NEW",
        location="Nowhere",
    )

    result = analyze(make_context(transaction, history=history))

    assert 0.0 <= result.risk_score <= 100.0
    assert 0.0 <= result.mule_probability <= 1.0
    assert 0.0 <= result.anomaly_score <= 1.0


# --------------------------------------------------------------------------- #
# Explainability
# --------------------------------------------------------------------------- #


def test_findings_carry_useful_evidence():
    history = [
        make_transaction(
            transaction_id=2,
            amount="50000.00",
            timestamp=BASE_TS - timedelta(minutes=5),
            sender_account_id=55,
            receiver_account_id=ACCOUNT_ID,
        )
    ]

    transaction = make_transaction(amount="48000.00", receiver_account_id=99)

    result = analyze(make_context(transaction, history=history))

    assert result.detected_patterns

    for pattern in result.detected_patterns:
        assert pattern.rule_id == pattern.code
        assert pattern.rule_name
        assert pattern.account_id == ACCOUNT_ID
        assert pattern.transaction_ids
        assert pattern.evidence
        assert pattern.score_contribution is not None
        assert 0.0 <= pattern.confidence <= 1.0

        # The explanation must read as a sentence, not a code.
        assert len(pattern.description) > 30

    findings = result.explanation["findings"]

    assert len(findings) == len(result.detected_patterns)
    assert {"rule_id", "rule_name", "family", "severity", "confidence",
            "transaction_ids", "evidence", "explanation"} <= set(findings[0])

    assert result.explanation["score_model"]["method"]
    assert result.explanation["family_breakdown"]


def test_quiet_account_explains_why_nothing_fired():
    result = analyze(make_context(make_transaction()))

    assert result.explanation["reasons"] == [
        "No behavioral risk rules triggered."
    ]
    assert result.explanation["triggered_rules"] == []
    assert len(result.explanation["rules_evaluated"]) == 17
