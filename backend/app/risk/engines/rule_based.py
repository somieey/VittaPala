from __future__ import annotations
 
import math
from dataclasses import dataclass, field
from datetime import datetime, timezone
from statistics import median
from typing import Optional
 
from app.risk.contracts import (
    RiskContext,
    RiskResult,
    RiskEngine,
    RiskLevel,
    DetectedPattern,
    TransactionData,
)
 
MODEL_VERSION = "rule_based-0.4.0"
 
# --------------------------------------------------------------------------- #
# Tunable thresholds (kept from the design we agreed on earlier).
# --------------------------------------------------------------------------- #
 
# Score -> risk level cut-offs. risk_score is 0..100.
MEDIUM_MIN = 25.0
HIGH_MIN = 50.0
CRITICAL_MIN = 75.0
 
# LARGE_TRANSACTION
LARGE_TXN_MIN_HISTORY = 3          # need this many past txns for a usable baseline
LARGE_TXN_RATIO_TRIGGER = 3.0      # fire when amount >= 3x the account's median
LARGE_TXN_BASE_POINTS = 10.0
LARGE_TXN_POINTS_PER_RATIO = 3.0
LARGE_TXN_MAX_POINTS = 40.0
LARGE_TXN_ABS_FALLBACK = 50_000.0  # absolute threshold used ONLY when no history
ANOMALY_RATIO_SCALE = 25.0         # ratio at which the amount anomaly saturates ~1.0
 
# NEW_DEVICE / NEW_LOCATION / NEW_RECEIVER
NEW_DEVICE_POINTS = 25.0
NEW_LOCATION_POINTS = 18.0
NEW_RECEIVER_POINTS = 12.0
 
# HIGH_VELOCITY
VELOCITY_WINDOW_MIN = 60           # minutes around the current transaction
VELOCITY_MIN_COUNT = 3             # including the current transaction
VELOCITY_BASE_POINTS = 20.0
VELOCITY_POINTS_PER_EXTRA = 6.0
VELOCITY_MAX_POINTS = 35.0
 
# STRUCTURING
STRUCTURING_WINDOW_HOURS = 24
STRUCTURING_MIN_COUNT = 3          # number of small transfers
STRUCTURING_INDIVIDUAL_MAX = 9_000.0   # each transfer "moderate" (just under a round threshold)
STRUCTURING_SUM_TRIGGER = 30_000.0     # collective sum that looks suspicious
STRUCTURING_POINTS = 35.0
 
# NEW_ACCOUNT
NEW_ACCOUNT_RECENT_DAYS = 30
NEW_ACCOUNT_VERY_RECENT_DAYS = 7
NEW_ACCOUNT_POINTS_RECENT = 10.0
NEW_ACCOUNT_POINTS_VERY_RECENT = 18.0
 
# mule_probability = logistic(risk_score): a smooth 0..1 S-curve.
MULE_MIDPOINT = 50.0
MULE_STEEPNESS = 0.08

# --------------------------------------------------------------------------- #
# Loophole / mule-behaviour thresholds. Every constant below is a tuning
# knob; no rule hardcodes a value inline.
# --------------------------------------------------------------------------- #

# RAPID_MOVEMENT - money in, money straight back out.
RAPID_MOVEMENT_WINDOW_MIN = 180     # how long after an inflow still counts
RAPID_MOVEMENT_MIN_RATIO = 0.60     # outflow must move >=60% of the inflow
RAPID_MOVEMENT_FAST_MIN = 10        # under this many minutes -> HIGH
RAPID_MOVEMENT_BASE_POINTS = 18.0
RAPID_MOVEMENT_SPEED_POINTS = 22.0  # added in full when the gap is ~zero
RAPID_MOVEMENT_MAX_POINTS = 40.0

# BURST_ACTIVITY - a tighter window than HIGH_VELOCITY.
BURST_WINDOW_MIN = 15
BURST_MIN_COUNT = 5                 # including the current transaction
BURST_BASE_POINTS = 22.0
BURST_POINTS_PER_EXTRA = 5.0
BURST_MAX_POINTS = 38.0

# FAN_IN / FAN_OUT - many-to-one and one-to-many counterparty spread.
FAN_WINDOW_HOURS = 24
FAN_IN_MIN_SENDERS = 4
FAN_OUT_MIN_RECEIVERS = 4
FAN_BASE_POINTS = 24.0
FAN_POINTS_PER_EXTRA = 4.0
FAN_MAX_POINTS = 42.0

# PASS_THROUGH - what comes in goes straight back out again.
PASS_THROUGH_WINDOW_HOURS = 24
PASS_THROUGH_MIN_INFLOW = 10_000.0  # ignore trivial sums
PASS_THROUGH_MIN_LEGS = 2
PASS_THROUGH_MIN_RATIO = 0.50       # forwarding half of what arrives is transit
PASS_THROUGH_MAX_RATIO = 1.20
PASS_THROUGH_POINTS = 30.0

# DORMANT_ACTIVATION - long quiet spell, then sudden movement.
DORMANT_MAX_PRIOR_TXNS = 2          # activity before the history window
DORMANT_MIN_ACCOUNT_AGE_DAYS = 30   # below this NEW_ACCOUNT already covers it
DORMANT_MIN_AMOUNT = 25_000.0
DORMANT_MIN_RECENT_COUNT = 5
DORMANT_POINTS = 28.0

# DEVICE_REUSE - a shared fingerprint is a signal, never proof by itself.
DEVICE_REUSE_MIN_ACCOUNTS = 2
DEVICE_REUSE_HIGH_ACCOUNTS = 4
DEVICE_REUSE_BASE_POINTS = 10.0
DEVICE_REUSE_POINTS_PER_EXTRA = 6.0
DEVICE_REUSE_MAX_POINTS = 34.0

# LOCATION_ANOMALY - several places in an implausibly short span.
LOCATION_WINDOW_HOURS = 6
LOCATION_MIN_DISTINCT = 2
LOCATION_BASE_POINTS = 14.0
LOCATION_POINTS_PER_EXTRA = 8.0
LOCATION_MAX_POINTS = 30.0

# FAILED_BURST - clusters of failed or reversed attempts.
FAILED_WINDOW_HOURS = 24
FAILED_MIN_COUNT = 3
FAILED_BASE_POINTS = 12.0
FAILED_POINTS_PER_EXTRA = 4.0
FAILED_MAX_POINTS = 26.0

# CIRCULAR_FLOW - money going back and forth with the same counterparty.
CIRCULAR_WINDOW_HOURS = 72
CIRCULAR_MIN_LEGS = 4
CIRCULAR_POINTS = 26.0

# --------------------------------------------------------------------------- #
# Score combination. Rules reading the same evidence sit in one family and
# are discounted against each other, so a single behaviour observed by two
# rules cannot be counted twice at full weight.
# --------------------------------------------------------------------------- #

FAMILY_WITHIN_DECAY = 0.35      # weight of the 2nd..nth rule inside a family
FAMILY_ACROSS_DECAY = 0.90      # weight decay across independent families

# --------------------------------------------------------------------------- #
# Baseline robustness.
#
# The old baseline was the median of the recent window alone, which is exactly
# the data an attacker controls: pre-load twenty transfers of 20,000 and a
# genuine 50,000 movement becomes "2.5x normal" and scores nothing. The
# baseline is now anchored to money moved 30-180 days ago as well, which
# cannot be rewritten today.
# --------------------------------------------------------------------------- #

# History depth at which the baseline is trusted in full. A median over three
# transactions is a guess, and the rule now says so instead of scoring 40.
LARGE_TXN_BASELINE_FULL_HISTORY = 10
LARGE_TXN_MIN_BASELINE_CONFIDENCE = 0.50

# How much a thin baseline is allowed to discount the finding. At 0.70 a
# minimum-confidence baseline still keeps 70% of the points: a 25x deviation
# is worth reporting even when we have only four transactions to compare to.
LARGE_TXN_CONFIDENCE_FLOOR = 0.70

# Recurring payments (rent, fees, EMI) look large against a median dominated by
# small everyday spend, but they are not anomalies - the account has moved this
# amount before. Precedent damps the finding rather than suppressing it,
# because a mule can repeat an amount too.
LARGE_TXN_PRECEDENT_TOLERANCE = 0.25
LARGE_TXN_PRECEDENT_DAMPENER = 0.40

# VOLUME_SPIKE - cumulative throughput, so splitting one large movement into
# several mid-sized legs no longer hides it.
VOLUME_WINDOW_HOURS = 24
VOLUME_MIN_LEGS = 2                 # a 2-leg spike is still a spike;
                                    # a single leg is LARGE_TRANSACTION's job
VOLUME_MIN_ABSOLUTE = 25_000.0      # ignore small accounts entirely
VOLUME_RATIO_TRIGGER = 4.0          # x the account's normal daily throughput

# If one transaction is most of the window's outflow, this is a single large
# payment - LARGE_TRANSACTION's job. Without this guard the same event scores
# twice, in two different families, and one legitimate payment reaches HIGH.
VOLUME_MAX_SINGLE_SHARE = 0.80
VOLUME_BASE_POINTS = 20.0
VOLUME_POINTS_PER_RATIO = 2.0
VOLUME_MAX_POINTS = 42.0
VOLUME_FALLBACK_DAILY_LEGS = 2.0    # 'a normal day' when no older anchor exists

# BASELINE_SHIFT - the account's normal transaction size has structurally
# moved. Catches slow escalation and deliberate baseline priming alike.
BASELINE_SHIFT_MIN_RECENT = 4
BASELINE_SHIFT_RATIO = 3.0
BASELINE_SHIFT_MIN_RECENT_MEDIAN = 3_000.0
BASELINE_SHIFT_POINTS = 24.0

# --------------------------------------------------------------------------- #
# Behavioural evidence vs. context.
#
# What the money did is evidence. Who the account is - new, on a shared phone,
# in a new city - is context: it makes real evidence worse but proves nothing
# on its own. Scoring them as peers is what turned a legitimate new customer
# paying rent into a CRITICAL alert.
# --------------------------------------------------------------------------- #

CONTEXT_FAMILIES = frozenset(
    {"account_age", "device", "location", "counterparty_novelty"}
)

# Context with no behavioural evidence behind it can reach MEDIUM, never HIGH.
CONTEXT_ONLY_CAP = 35.0

# When behaviour IS abnormal, context amplifies it - but never dominates.
CONTEXT_WEIGHT = 0.50
CONTEXT_MAX_SHARE = 0.50
 
 
# --------------------------------------------------------------------------- #
# Internal helpers
# --------------------------------------------------------------------------- #
 
@dataclass
class _RuleHit:
    """One triggered rule; the engine aggregates these into a RiskResult."""
    code: str
    points: float
    severity: RiskLevel
    reason: str
    anomaly: float = 0.0            # transaction-level anomaly contribution (0..1)
    details: dict = field(default_factory=dict)
    confidence: Optional[float] = None      # 0..1 evidence strength
    transaction_ids: list = field(default_factory=list)
 
 
def _to_float(x) -> float:
    return float(x) if x is not None else 0.0
 
 
def _naive(dt: datetime) -> datetime:
    """Normalize to naive-UTC so aware and naive datetimes never get compared."""
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt
 
 
def _level_from_score(score: float) -> RiskLevel:
    if score >= CRITICAL_MIN:
        return RiskLevel.CRITICAL
    if score >= HIGH_MIN:
        return RiskLevel.HIGH
    if score >= MEDIUM_MIN:
        return RiskLevel.MEDIUM
    return RiskLevel.LOW
 
 
def _logistic(score: float) -> float:
    return 1.0 / (1.0 + math.exp(-MULE_STEEPNESS * (score - MULE_MIDPOINT)))
 
 
# --------------------------------------------------------------------------- #
# Individual rules — each returns an _RuleHit or None
# --------------------------------------------------------------------------- #
 
def _baseline_confidence(history_count: int) -> float:
    """
    How much the account's own history can be trusted as a baseline.
    Three transactions is a guess; ten is a habit.
    """
    if history_count >= LARGE_TXN_BASELINE_FULL_HISTORY:
        return 1.0

    span = max(1, LARGE_TXN_BASELINE_FULL_HISTORY - LARGE_TXN_MIN_HISTORY)
    progress = (history_count - LARGE_TXN_MIN_HISTORY) / span

    return round(
        LARGE_TXN_MIN_BASELINE_CONFIDENCE
        + (1.0 - LARGE_TXN_MIN_BASELINE_CONFIDENCE) * max(0.0, progress),
        4,
    )


def _robust_baseline(ctx: RiskContext, amounts: list) -> tuple:
    """
    Baseline resistant to priming.

    The recent median alone is attacker-controlled. Where the account has
    pre-window history, the lower of (recent median, pre-window average) is
    used: inflating recent activity no longer raises the bar, because the
    older anchor stays put.

    Returns (baseline, anchor_used, prior_average).
    """
    recent_median = max(median(amounts), 1.0)

    prior_average = ctx.related_data.get("prior_activity_average")

    if isinstance(prior_average, (int, float)) and prior_average > 0:
        if prior_average < recent_median:
            return max(float(prior_average), 1.0), "pre_window_average", float(
                prior_average
            )
        return recent_median, "recent_median", float(prior_average)

    return recent_median, "recent_median", None


def _has_precedent(current: float, amounts: list) -> bool:
    """True when this account has already moved a comparable amount."""
    if current <= 0:
        return False

    low = current * (1.0 - LARGE_TXN_PRECEDENT_TOLERANCE)
    high = current * (1.0 + LARGE_TXN_PRECEDENT_TOLERANCE)

    return any(low <= amount <= high for amount in amounts)


def _rule_large_transaction(ctx: RiskContext) -> Optional[_RuleHit]:
    current = _to_float(ctx.transaction.amount)
    amounts = [_to_float(t.amount) for t in ctx.recent_transactions]

    if len(amounts) >= LARGE_TXN_MIN_HISTORY:
        baseline, anchor, prior_average = _robust_baseline(ctx, amounts)
        ratio = current / baseline
        if ratio < LARGE_TXN_RATIO_TRIGGER:
            return None
        confidence = _baseline_confidence(len(amounts))
        points = min(
            LARGE_TXN_MAX_POINTS,
            LARGE_TXN_BASE_POINTS
            + (ratio - LARGE_TXN_RATIO_TRIGGER) * LARGE_TXN_POINTS_PER_RATIO,
        ) * (
            LARGE_TXN_CONFIDENCE_FLOOR
            + (1.0 - LARGE_TXN_CONFIDENCE_FLOOR) * confidence
        )
        precedent = _has_precedent(current, amounts)
        if precedent:
            points *= LARGE_TXN_PRECEDENT_DAMPENER
        if ratio >= 10:
            severity = RiskLevel.HIGH
        elif ratio >= 5:
            severity = RiskLevel.MEDIUM
        else:
            severity = RiskLevel.LOW
        anomaly = min(1.0, ratio / ANOMALY_RATIO_SCALE)
        reason = (
            f"Amount \u20b9{current:,.0f} is {ratio:.1f}\u00d7 this account's typical "
            f"spend (median \u20b9{baseline:,.0f} over the last {len(amounts)} "
            f"transactions)."
        )
        if precedent:
            reason += (
                " The account has moved a comparable amount before, so this "
                "is treated as a recurring payment rather than a new anomaly."
            )
        return _RuleHit(
            "LARGE_TRANSACTION", points, severity, reason, anomaly,
            {
                "current_amount": current,
                "baseline_median": round(baseline, 2),
                "baseline_anchor": anchor,
                "pre_window_average": prior_average,
                "ratio": round(ratio, 2),
                "history_count": len(amounts),
                "baseline_confidence": confidence,
                "has_precedent": precedent,
            },
            confidence=confidence,
        )
 
    # No usable history -> fall back to an absolute sanity threshold.
    if current >= LARGE_TXN_ABS_FALLBACK:
        reason = (
            f"Amount \u20b9{current:,.0f} is large and there is not enough history "
            f"to establish a baseline."
        )
        return _RuleHit(
            "LARGE_TRANSACTION", 20.0, RiskLevel.MEDIUM, reason,
            min(1.0, current / (LARGE_TXN_ABS_FALLBACK * 2)),
            {"current_amount": current, "baseline_median": None, "ratio": None},
        )
    return None
 
 
def _rule_new_device(ctx: RiskContext) -> Optional[_RuleHit]:
    known = ctx.related_data.get("known_devices") or []
    fp = ctx.transaction.device_fingerprint
    if not known or fp is None:        # no history -> do not trigger
        return None
    if fp in known:
        return None
    reason = (
        f"Device '{fp}' has never been seen on this account "
        f"(known device(s): {', '.join(map(str, known))})."
    )
    return _RuleHit(
        "NEW_DEVICE", NEW_DEVICE_POINTS, RiskLevel.MEDIUM, reason, 0.30,
        {"device": fp, "known_devices": known},
    )
 
 
def _rule_new_location(ctx: RiskContext) -> Optional[_RuleHit]:
    known = ctx.related_data.get("known_locations") or []
    loc = ctx.transaction.location
    if not known or loc is None:       # no history -> do not trigger
        return None
    if loc in known:
        return None
    reason = (
        f"Location '{loc}' is new for this account "
        f"(usual location(s): {', '.join(map(str, known))})."
    )
    return _RuleHit(
        "NEW_LOCATION", NEW_LOCATION_POINTS, RiskLevel.MEDIUM, reason, 0.20,
        {"location": loc, "known_locations": known},
    )
 
 
def _rule_new_receiver(ctx: RiskContext) -> Optional[_RuleHit]:
    scored = ctx.account.account_id
    sender = ctx.transaction.sender_account_id
    receiver = ctx.transaction.receiver_account_id
    # Only for OUTGOING transactions (this account is the sender) with a
    # known internal counterparty to check against.
    if sender != scored or receiver is None:
        return None
    known = ctx.related_data.get("known_receivers") or []
    if not known or receiver in known:
        return None
    reason = (
        f"Outgoing transfer to account {receiver}, which this account has "
        f"never sent money to before."
    )
    return _RuleHit(
        "NEW_RECEIVER", NEW_RECEIVER_POINTS, RiskLevel.LOW, reason, 0.15,
        {"receiver": receiver, "known_receivers": known},
    )
 
 
def _rule_high_velocity(ctx: RiskContext) -> Optional[_RuleHit]:
    cur_ts = _naive(ctx.transaction.transaction_timestamp)
    window_s = VELOCITY_WINDOW_MIN * 60
    count = 1  # the current transaction
    for t in ctx.recent_transactions:
        ts = _naive(t.transaction_timestamp)
        if abs((cur_ts - ts).total_seconds()) <= window_s:
            count += 1
    if count < VELOCITY_MIN_COUNT:
        return None
    points = min(
        VELOCITY_MAX_POINTS,
        VELOCITY_BASE_POINTS + (count - VELOCITY_MIN_COUNT) * VELOCITY_POINTS_PER_EXTRA,
    )
    severity = RiskLevel.HIGH if count >= VELOCITY_MIN_COUNT + 2 else RiskLevel.MEDIUM
    reason = (
        f"{count} transactions within {VELOCITY_WINDOW_MIN} minutes \u2014 "
        f"unusually rapid activity."
    )
    return _RuleHit(
        "HIGH_VELOCITY", points, severity, reason, 0.25,
        {"count_in_window": count, "window_minutes": VELOCITY_WINDOW_MIN},
    )
 
 
def _rule_structuring(ctx: RiskContext) -> Optional[_RuleHit]:
    scored = ctx.account.account_id
    cur_ts = _naive(ctx.transaction.transaction_timestamp)
    window_s = STRUCTURING_WINDOW_HOURS * 3600
    moderate: list[float] = []
 
    # Include the current transaction if it is outgoing and moderate.
    cur_amt = _to_float(ctx.transaction.amount)
    if (ctx.transaction.sender_account_id == scored
            and cur_amt <= STRUCTURING_INDIVIDUAL_MAX):
        moderate.append(cur_amt)
 
    # Include outgoing, moderate transfers within the trailing window.
    for t in ctx.recent_transactions:
        delta = (cur_ts - _naive(t.transaction_timestamp)).total_seconds()
        if 0 <= delta <= window_s:
            amt = _to_float(t.amount)
            if t.sender_account_id == scored and amt <= STRUCTURING_INDIVIDUAL_MAX:
                moderate.append(amt)
 
    if len(moderate) < STRUCTURING_MIN_COUNT:
        return None
    total = sum(moderate)
    if total < STRUCTURING_SUM_TRIGGER:
        return None
 
    reason = (
        f"{len(moderate)} smaller outgoing transfers (each \u2264 "
        f"\u20b9{STRUCTURING_INDIVIDUAL_MAX:,.0f}) within {STRUCTURING_WINDOW_HOURS}h "
        f"totalling \u20b9{total:,.0f} \u2014 possible structuring to stay under the radar."
    )
    return _RuleHit(
        "STRUCTURING", STRUCTURING_POINTS, RiskLevel.HIGH, reason, 0.15,
        {"count": len(moderate), "total": round(total, 2),
         "window_hours": STRUCTURING_WINDOW_HOURS},
    )
 
 
def _rule_new_account(ctx: RiskContext) -> Optional[_RuleHit]:
    opened = ctx.account.date_opened
    if opened is None:
        return None
    cur_ts = _naive(ctx.transaction.transaction_timestamp)
    if isinstance(opened, datetime):
        opened_dt = _naive(opened)
    else:  # a date
        opened_dt = datetime(opened.year, opened.month, opened.day)
    age_days = (cur_ts - opened_dt).days
    if age_days < 0 or age_days > NEW_ACCOUNT_RECENT_DAYS:
        return None
    if age_days <= NEW_ACCOUNT_VERY_RECENT_DAYS:
        points, severity = NEW_ACCOUNT_POINTS_VERY_RECENT, RiskLevel.HIGH
    else:
        points, severity = NEW_ACCOUNT_POINTS_RECENT, RiskLevel.MEDIUM
    reason = (
        f"Account was opened {age_days} day(s) ago \u2014 brand-new accounts moving "
        f"money are a common mule signal."
    )
    return _RuleHit(
        "NEW_ACCOUNT", points, severity, reason, 0.0, {"age_days": age_days},
    )
 
 
# --------------------------------------------------------------------------- #
# Loophole rules - shared evidence helpers
# --------------------------------------------------------------------------- #


def _is_outgoing(t: TransactionData, account_id: int) -> bool:
    return t.sender_account_id == account_id


def _is_incoming(t: TransactionData, account_id: int) -> bool:
    return t.receiver_account_id == account_id


def _is_settled(t: TransactionData) -> bool:
    """Money actually moved. Failed/reversed legs never moved funds."""
    return (t.status or "completed").lower() not in ("failed", "reversed")


def _is_failed(t: TransactionData) -> bool:
    return (t.status or "").lower() in ("failed", "reversed")


def _age_seconds(cur_ts: datetime, t: TransactionData) -> float:
    """Seconds between t and the transaction under analysis. Negative = later."""
    return (cur_ts - _naive(t.transaction_timestamp)).total_seconds()


def _preceding(cur_ts: datetime, t: TransactionData, window_s: float) -> bool:
    """True when t sits inside the trailing window (not in the future)."""
    delta = _age_seconds(cur_ts, t)
    return 0 <= delta <= window_s


def _surrounding(cur_ts: datetime, t: TransactionData, window_s: float) -> bool:
    """True when t sits within the window on either side."""
    return abs(_age_seconds(cur_ts, t)) <= window_s


def _confidence(observed: int, full_at: int) -> float:
    """
    Evidence strength on 0..1 - how much corroboration the finding rests on,
    which is deliberately separate from how severe the finding is.
    """
    if full_at <= 0:
        return 1.0
    return round(min(1.0, observed / float(full_at)), 4)


def _account_age_days(ctx: RiskContext) -> Optional[int]:
    opened = ctx.account.date_opened
    if opened is None:
        return None
    cur_ts = _naive(ctx.transaction.transaction_timestamp)
    if isinstance(opened, datetime):
        opened_dt = _naive(opened)
    else:
        opened_dt = datetime(opened.year, opened.month, opened.day)
    return (cur_ts - opened_dt).days


# --------------------------------------------------------------------------- #
# Loophole rules
# --------------------------------------------------------------------------- #


def _rule_rapid_movement(ctx: RiskContext) -> Optional[_RuleHit]:
    """Funds arrive and are pushed straight back out - classic mule hop."""
    account_id = ctx.account.account_id
    current = ctx.transaction

    if not _is_outgoing(current, account_id) or not _is_settled(current):
        return None

    cur_ts = _naive(current.transaction_timestamp)
    cur_amount = _to_float(current.amount)
    window_s = RAPID_MOVEMENT_WINDOW_MIN * 60

    # The closest preceding inflow is the one this outflow most likely drains.
    inflow = None
    inflow_delta = None

    for t in ctx.recent_transactions:
        if not _is_incoming(t, account_id) or not _is_settled(t):
            continue
        delta = _age_seconds(cur_ts, t)
        if 0 <= delta <= window_s and (inflow_delta is None or delta < inflow_delta):
            inflow, inflow_delta = t, delta

    if inflow is None:
        return None

    inflow_amount = _to_float(inflow.amount)
    if inflow_amount <= 0:
        return None

    ratio = cur_amount / inflow_amount
    if ratio < RAPID_MOVEMENT_MIN_RATIO:
        return None

    minutes = inflow_delta / 60.0
    speed = 1.0 - (inflow_delta / window_s)     # 1.0 = instant, 0.0 = window edge

    points = min(
        RAPID_MOVEMENT_MAX_POINTS,
        RAPID_MOVEMENT_BASE_POINTS + speed * RAPID_MOVEMENT_SPEED_POINTS,
    )

    inflow_legs = sum(
        1
        for t in ctx.recent_transactions
        if _is_incoming(t, account_id) and _preceding(cur_ts, t, window_s)
    )

    severity = (
        RiskLevel.HIGH if minutes <= RAPID_MOVEMENT_FAST_MIN else RiskLevel.MEDIUM
    )

    reason = (
        f"₹{cur_amount:,.0f} left the account {minutes:.0f} minute(s) after "
        f"₹{inflow_amount:,.0f} arrived ({ratio * 100:.0f}% of the incoming "
        f"amount) - funds were not held, only forwarded."
    )

    return _RuleHit(
        "RAPID_MOVEMENT", points, severity, reason, 0.30,
        {
            "inflow_transaction_id": inflow.transaction_id,
            "inflow_amount": inflow_amount,
            "outflow_amount": cur_amount,
            "forwarded_ratio": round(ratio, 4),
            "minutes_between": round(minutes, 2),
            "window_minutes": RAPID_MOVEMENT_WINDOW_MIN,
            "inflow_legs_in_window": inflow_legs,
        },
        confidence=_confidence(inflow_legs, 2),
        transaction_ids=[inflow.transaction_id, current.transaction_id],
    )


def _rule_burst_activity(ctx: RiskContext) -> Optional[_RuleHit]:
    """A tight burst of transactions - tighter than HIGH_VELOCITY."""
    cur_ts = _naive(ctx.transaction.transaction_timestamp)
    window_s = BURST_WINDOW_MIN * 60

    ids = [ctx.transaction.transaction_id]
    ids.extend(
        t.transaction_id
        for t in ctx.recent_transactions
        if _surrounding(cur_ts, t, window_s)
    )

    count = len(ids)
    if count < BURST_MIN_COUNT:
        return None

    points = min(
        BURST_MAX_POINTS,
        BURST_BASE_POINTS + (count - BURST_MIN_COUNT) * BURST_POINTS_PER_EXTRA,
    )

    severity = (
        RiskLevel.HIGH if count >= BURST_MIN_COUNT + 3 else RiskLevel.MEDIUM
    )

    reason = (
        f"{count} transactions inside a {BURST_WINDOW_MIN}-minute window - a burst "
        f"far tighter than normal account use."
    )

    return _RuleHit(
        "BURST_ACTIVITY", points, severity, reason, 0.25,
        {
            "count_in_window": count,
            "window_minutes": BURST_WINDOW_MIN,
            "trigger_count": BURST_MIN_COUNT,
        },
        confidence=_confidence(count, BURST_MIN_COUNT + 3),
        transaction_ids=sorted(ids),
    )


def _rule_fan_in(ctx: RiskContext) -> Optional[_RuleHit]:
    """Many distinct senders paying into one account (many-to-one)."""
    account_id = ctx.account.account_id
    cur_ts = _naive(ctx.transaction.transaction_timestamp)
    window_s = FAN_WINDOW_HOURS * 3600

    senders = set()
    ids = []
    total = 0.0

    legs = [ctx.transaction] + [
        t for t in ctx.recent_transactions if _preceding(cur_ts, t, window_s)
    ]

    for t in legs:
        if not _is_incoming(t, account_id) or not _is_settled(t):
            continue
        if t.sender_account_id is None:
            continue
        senders.add(t.sender_account_id)
        ids.append(t.transaction_id)
        total += _to_float(t.amount)

    if len(senders) < FAN_IN_MIN_SENDERS:
        return None

    points = min(
        FAN_MAX_POINTS,
        FAN_BASE_POINTS + (len(senders) - FAN_IN_MIN_SENDERS) * FAN_POINTS_PER_EXTRA,
    )

    severity = (
        RiskLevel.HIGH
        if len(senders) >= FAN_IN_MIN_SENDERS + 3
        else RiskLevel.MEDIUM
    )

    reason = (
        f"{len(senders)} different accounts paid a total of ₹{total:,.0f} into "
        f"this account within {FAN_WINDOW_HOURS}h - collection behaviour typical of "
        f"a funnel account."
    )

    return _RuleHit(
        "FAN_IN", points, severity, reason, 0.25,
        {
            "distinct_senders": len(senders),
            "sender_account_ids": sorted(senders),
            "total_inflow": round(total, 2),
            "window_hours": FAN_WINDOW_HOURS,
        },
        confidence=_confidence(len(senders), FAN_IN_MIN_SENDERS + 3),
        transaction_ids=sorted(ids),
    )


def _rule_fan_out(ctx: RiskContext) -> Optional[_RuleHit]:
    """One account distributing to many receivers (one-to-many)."""
    account_id = ctx.account.account_id
    cur_ts = _naive(ctx.transaction.transaction_timestamp)
    window_s = FAN_WINDOW_HOURS * 3600

    receivers = set()
    ids = []
    total = 0.0

    legs = [ctx.transaction] + [
        t for t in ctx.recent_transactions if _preceding(cur_ts, t, window_s)
    ]

    for t in legs:
        if not _is_outgoing(t, account_id) or not _is_settled(t):
            continue
        if t.receiver_account_id is None:
            continue
        receivers.add(t.receiver_account_id)
        ids.append(t.transaction_id)
        total += _to_float(t.amount)

    if len(receivers) < FAN_OUT_MIN_RECEIVERS:
        return None

    points = min(
        FAN_MAX_POINTS,
        FAN_BASE_POINTS
        + (len(receivers) - FAN_OUT_MIN_RECEIVERS) * FAN_POINTS_PER_EXTRA,
    )

    severity = (
        RiskLevel.HIGH
        if len(receivers) >= FAN_OUT_MIN_RECEIVERS + 3
        else RiskLevel.MEDIUM
    )

    reason = (
        f"Funds were split across {len(receivers)} different receivers totalling "
        f"₹{total:,.0f} within {FAN_WINDOW_HOURS}h - rapid distribution rather "
        f"than ordinary spending."
    )

    return _RuleHit(
        "FAN_OUT", points, severity, reason, 0.25,
        {
            "distinct_receivers": len(receivers),
            "receiver_account_ids": sorted(receivers),
            "total_outflow": round(total, 2),
            "window_hours": FAN_WINDOW_HOURS,
        },
        confidence=_confidence(len(receivers), FAN_OUT_MIN_RECEIVERS + 3),
        transaction_ids=sorted(ids),
    )


def _rule_pass_through(ctx: RiskContext) -> Optional[_RuleHit]:
    """Nearly everything received is sent on - a transit account, not a wallet."""
    account_id = ctx.account.account_id
    cur_ts = _naive(ctx.transaction.transaction_timestamp)
    window_s = PASS_THROUGH_WINDOW_HOURS * 3600

    inflow_total = 0.0
    outflow_total = 0.0
    in_ids = []
    out_ids = []

    legs = [ctx.transaction] + [
        t for t in ctx.recent_transactions if _preceding(cur_ts, t, window_s)
    ]

    for t in legs:
        if not _is_settled(t):
            continue
        if _is_incoming(t, account_id):
            inflow_total += _to_float(t.amount)
            in_ids.append(t.transaction_id)
        elif _is_outgoing(t, account_id):
            outflow_total += _to_float(t.amount)
            out_ids.append(t.transaction_id)

    if inflow_total < PASS_THROUGH_MIN_INFLOW:
        return None

    if not in_ids or not out_ids:
        return None

    if len(in_ids) + len(out_ids) < PASS_THROUGH_MIN_LEGS:
        return None

    ratio = outflow_total / inflow_total

    if ratio < PASS_THROUGH_MIN_RATIO or ratio > PASS_THROUGH_MAX_RATIO:
        return None

    retained = inflow_total - outflow_total

    # Forwarding 95% is more transit-like than forwarding 55%; score it that
    # way rather than treating everything inside the band identically.
    forwarded_strength = min(1.0, ratio / PASS_THROUGH_MAX_RATIO)
    graded_points = PASS_THROUGH_POINTS * (0.6 + 0.4 * forwarded_strength)

    severity = RiskLevel.HIGH if ratio >= 0.80 else RiskLevel.MEDIUM

    reason = (
        f"₹{inflow_total:,.0f} in and ₹{outflow_total:,.0f} out over "
        f"{PASS_THROUGH_WINDOW_HOURS}h ({ratio * 100:.0f}% forwarded, only "
        f"₹{retained:,.0f} retained) - the account is being used to move money "
        f"through rather than to hold it."
    )

    return _RuleHit(
        "PASS_THROUGH", graded_points, severity, reason, 0.30,
        {
            "inflow_total": round(inflow_total, 2),
            "outflow_total": round(outflow_total, 2),
            "forwarded_ratio": round(ratio, 4),
            "retained_amount": round(retained, 2),
            "inflow_legs": len(in_ids),
            "outflow_legs": len(out_ids),
            "window_hours": PASS_THROUGH_WINDOW_HOURS,
        },
        confidence=_confidence(len(in_ids) + len(out_ids), 4),
        transaction_ids=sorted(set(in_ids + out_ids)),
    )


def _rule_dormant_activation(ctx: RiskContext) -> Optional[_RuleHit]:
    """An account that was quiet for months suddenly starts moving money."""
    prior_count = ctx.related_data.get("prior_activity_count")

    # Without the long-lookback aggregate there is no way to tell dormant
    # from simply new, so the rule stays silent.
    if prior_count is None:
        return None

    if prior_count > DORMANT_MAX_PRIOR_TXNS:
        return None

    age_days = _account_age_days(ctx)

    # A brand-new account is NEW_ACCOUNT's job, not dormancy.
    if age_days is None or age_days < DORMANT_MIN_ACCOUNT_AGE_DAYS:
        return None

    amount = _to_float(ctx.transaction.amount)
    recent_count = len(ctx.recent_transactions) + 1

    high_value = amount >= DORMANT_MIN_AMOUNT
    high_frequency = recent_count >= DORMANT_MIN_RECENT_COUNT

    if not (high_value or high_frequency):
        return None

    quiet_days = ctx.related_data.get("days_since_previous_activity")
    prior_days = ctx.related_data.get("prior_activity_days", "?")

    if high_value and high_frequency:
        trigger = f"₹{amount:,.0f} and {recent_count} transactions"
    elif high_value:
        trigger = f"₹{amount:,.0f}"
    else:
        trigger = f"{recent_count} transactions"

    quiet_phrase = (
        f" after {quiet_days:.0f} quiet day(s)"
        if isinstance(quiet_days, (int, float))
        else ""
    )

    reason = (
        f"Account is {age_days} day(s) old but recorded only {prior_count} "
        f"transaction(s) in the {prior_days} days before this window, then moved "
        f"{trigger}{quiet_phrase} - dormant accounts waking up suddenly are a "
        f"common mule-recruitment pattern."
    )

    return _RuleHit(
        "DORMANT_ACTIVATION", DORMANT_POINTS, RiskLevel.HIGH, reason, 0.25,
        {
            "prior_activity_count": prior_count,
            "prior_activity_days": prior_days,
            "days_since_previous_activity": quiet_days,
            "account_age_days": age_days,
            "current_amount": amount,
            "recent_transaction_count": recent_count,
            "triggered_by_value": high_value,
            "triggered_by_frequency": high_frequency,
        },
        confidence=_confidence(2 if (high_value and high_frequency) else 1, 2),
        transaction_ids=[ctx.transaction.transaction_id],
    )


def _rule_device_reuse(ctx: RiskContext) -> Optional[_RuleHit]:
    """
    One device operating several accounts. Treated as a risk signal that
    needs corroboration - shared phones and family devices are legitimate.
    """
    account_ids = ctx.related_data.get("device_account_ids") or []

    if len(account_ids) < DEVICE_REUSE_MIN_ACCOUNTS:
        return None

    fingerprint = (
        ctx.related_data.get("device_fingerprint")
        or ctx.transaction.device_fingerprint
    )

    others = sorted(a for a in account_ids if a != ctx.account.account_id)

    points = min(
        DEVICE_REUSE_MAX_POINTS,
        DEVICE_REUSE_BASE_POINTS
        + (len(account_ids) - DEVICE_REUSE_MIN_ACCOUNTS)
        * DEVICE_REUSE_POINTS_PER_EXTRA,
    )

    if len(account_ids) >= DEVICE_REUSE_HIGH_ACCOUNTS:
        severity = RiskLevel.HIGH
    elif len(account_ids) > DEVICE_REUSE_MIN_ACCOUNTS:
        severity = RiskLevel.MEDIUM
    else:
        # Exactly two accounts on one handset is overwhelmingly a household.
        severity = RiskLevel.LOW

    lookback = ctx.related_data.get("device_lookback_days", "?")

    reason = (
        f"Device '{fingerprint}' has operated {len(account_ids)} different accounts "
        f"in the last {lookback} days (also: "
        f"{', '.join(map(str, others)) or 'none'}). Shared devices have innocent "
        f"explanations, so this is a supporting signal rather than proof."
    )

    return _RuleHit(
        "DEVICE_REUSE", points, severity, reason, 0.20,
        {
            "device_fingerprint": fingerprint,
            "account_count": len(account_ids),
            "account_ids": sorted(account_ids),
            "other_account_ids": others,
            "lookback_days": lookback,
            "signal_only": True,
        },
        confidence=_confidence(len(account_ids), DEVICE_REUSE_HIGH_ACCOUNTS),
        transaction_ids=[ctx.transaction.transaction_id],
    )


def _rule_location_anomaly(ctx: RiskContext) -> Optional[_RuleHit]:
    """Several distinct locations inside a window too short to travel it."""
    current = ctx.transaction

    if not current.location:
        return None

    cur_ts = _naive(current.transaction_timestamp)
    window_s = LOCATION_WINDOW_HOURS * 3600

    locations = {current.location: [current.transaction_id]}

    for t in ctx.recent_transactions:
        if t.location and _preceding(cur_ts, t, window_s):
            locations.setdefault(t.location, []).append(t.transaction_id)

    if len(locations) < LOCATION_MIN_DISTINCT:
        return None

    points = min(
        LOCATION_MAX_POINTS,
        LOCATION_BASE_POINTS
        + (len(locations) - LOCATION_MIN_DISTINCT) * LOCATION_POINTS_PER_EXTRA,
    )

    severity = (
        RiskLevel.HIGH if len(locations) >= LOCATION_MIN_DISTINCT + 2
        else RiskLevel.MEDIUM
    )

    names = sorted(locations)
    ids = sorted({i for group in locations.values() for i in group})

    reason = (
        f"Activity from {len(locations)} locations ({', '.join(names)}) within "
        f"{LOCATION_WINDOW_HOURS}h. Only place names are recorded, so travel time "
        f"cannot be verified - treat as unusual movement, not impossible travel."
    )

    return _RuleHit(
        "LOCATION_ANOMALY", points, severity, reason, 0.20,
        {
            "distinct_locations": len(locations),
            "locations": names,
            "window_hours": LOCATION_WINDOW_HOURS,
            "coordinates_available": False,
        },
        confidence=_confidence(len(locations), LOCATION_MIN_DISTINCT + 2),
        transaction_ids=ids,
    )


def _rule_failed_burst(ctx: RiskContext) -> Optional[_RuleHit]:
    """Clusters of failed or reversed attempts - probing or card testing."""
    current = ctx.transaction
    cur_ts = _naive(current.transaction_timestamp)
    window_s = FAILED_WINDOW_HOURS * 3600

    failed_ids = []
    total = 1

    if _is_failed(current):
        failed_ids.append(current.transaction_id)

    for t in ctx.recent_transactions:
        if not _preceding(cur_ts, t, window_s):
            continue
        total += 1
        if _is_failed(t):
            failed_ids.append(t.transaction_id)

    if len(failed_ids) < FAILED_MIN_COUNT:
        return None

    ratio = len(failed_ids) / float(total) if total else 0.0

    points = min(
        FAILED_MAX_POINTS,
        FAILED_BASE_POINTS
        + (len(failed_ids) - FAILED_MIN_COUNT) * FAILED_POINTS_PER_EXTRA,
    )

    severity = RiskLevel.MEDIUM if ratio >= 0.5 else RiskLevel.LOW

    reason = (
        f"{len(failed_ids)} of {total} transactions in the last "
        f"{FAILED_WINDOW_HOURS}h failed or were reversed ({ratio * 100:.0f}%) - "
        f"repeated failures can indicate probing for a working route."
    )

    return _RuleHit(
        "FAILED_BURST", points, severity, reason, 0.15,
        {
            "failed_count": len(failed_ids),
            "total_in_window": total,
            "failure_ratio": round(ratio, 4),
            "window_hours": FAILED_WINDOW_HOURS,
        },
        confidence=_confidence(len(failed_ids), FAILED_MIN_COUNT + 2),
        transaction_ids=sorted(failed_ids),
    )


def _rule_circular_flow(ctx: RiskContext) -> Optional[_RuleHit]:
    """
    Money bouncing back and forth with the same counterparty. Only direct
    round trips are visible here; longer cycles need the transaction graph.
    """
    account_id = ctx.account.account_id
    cur_ts = _naive(ctx.transaction.transaction_timestamp)
    window_s = CIRCULAR_WINDOW_HOURS * 3600

    sent_to = {}
    received_from = {}

    legs = [ctx.transaction] + [
        t for t in ctx.recent_transactions if _preceding(cur_ts, t, window_s)
    ]

    for t in legs:
        if not _is_settled(t):
            continue
        if _is_outgoing(t, account_id) and t.receiver_account_id is not None:
            sent_to.setdefault(t.receiver_account_id, []).append(t.transaction_id)
        elif _is_incoming(t, account_id) and t.sender_account_id is not None:
            received_from.setdefault(t.sender_account_id, []).append(t.transaction_id)

    loops = sorted(set(sent_to) & set(received_from))

    if not loops:
        return None

    ids = []
    for counterparty in loops:
        ids.extend(sent_to[counterparty])
        ids.extend(received_from[counterparty])

    ids = sorted(set(ids))

    if len(ids) < CIRCULAR_MIN_LEGS:
        return None

    reason = (
        f"Money moved in both directions with {len(loops)} counterparty account(s) "
        f"({', '.join(map(str, loops))}) across {len(ids)} transactions in "
        f"{CIRCULAR_WINDOW_HOURS}h - circular flow that does not resemble ordinary "
        f"payment activity."
    )

    return _RuleHit(
        "CIRCULAR_FLOW", CIRCULAR_POINTS, RiskLevel.HIGH, reason, 0.25,
        {
            "counterparty_account_ids": loops,
            "leg_count": len(ids),
            "window_hours": CIRCULAR_WINDOW_HOURS,
            "direct_round_trips_only": True,
        },
        confidence=_confidence(len(ids), CIRCULAR_MIN_LEGS + 2),
        transaction_ids=ids,
    )


def _rule_volume_spike(ctx: RiskContext) -> Optional[_RuleHit]:
    """
    Cumulative outflow over a day, judged against what this account normally
    moves in a day.

    This is the anti-splitting rule. LARGE_TRANSACTION only ever sees one leg,
    so five transfers of 10,000 slip past it while 50,000 in one go does not.
    Throughput does not care how the total was chopped up.
    """
    account_id = ctx.account.account_id
    cur_ts = _naive(ctx.transaction.transaction_timestamp)
    window_s = VOLUME_WINDOW_HOURS * 3600

    legs = [ctx.transaction] + [
        t for t in ctx.recent_transactions if _preceding(cur_ts, t, window_s)
    ]

    outgoing = [
        t for t in legs
        if _is_outgoing(t, account_id) and _is_settled(t)
    ]

    if len(outgoing) < VOLUME_MIN_LEGS:
        return None

    total = sum(_to_float(t.amount) for t in outgoing)

    if total < VOLUME_MIN_ABSOLUTE:
        return None

    # This rule is about accumulation across legs. When a single transfer
    # dominates the window there is no accumulation to report.
    largest_leg = max(_to_float(t.amount) for t in outgoing)

    if total > 0 and (largest_leg / total) > VOLUME_MAX_SINGLE_SHARE:
        return None

    # Preferred anchor: money moved 30-180 days ago, which today's activity
    # cannot rewrite. Fallback: the recent median, used only when the account
    # has no pre-window history at all (a genuinely young account has little
    # for an attacker to prime).
    prior_total = ctx.related_data.get("prior_activity_total")
    prior_days = ctx.related_data.get("prior_activity_days")

    if (
        isinstance(prior_total, (int, float))
        and prior_total > 0
        and isinstance(prior_days, (int, float))
        and prior_days > 0
    ):
        baseline_daily = max(float(prior_total) / float(prior_days), 1.0)
        anchor = "pre_window_daily_average"
    else:
        amounts = [_to_float(t.amount) for t in ctx.recent_transactions]
        if not amounts:
            return None
        baseline_daily = max(
            median(amounts) * VOLUME_FALLBACK_DAILY_LEGS, 1.0
        )
        anchor = "recent_median_fallback"

    ratio = total / baseline_daily

    if ratio < VOLUME_RATIO_TRIGGER:
        return None

    points = min(
        VOLUME_MAX_POINTS,
        VOLUME_BASE_POINTS
        + (ratio - VOLUME_RATIO_TRIGGER) * VOLUME_POINTS_PER_RATIO,
    )

    severity = (
        RiskLevel.HIGH
        if ratio >= VOLUME_RATIO_TRIGGER * 3
        else RiskLevel.MEDIUM
    )

    reason = (
        f"\u20b9{total:,.0f} left the account across {len(outgoing)} transfers in "
        f"{VOLUME_WINDOW_HOURS}h - {ratio:.1f}x its normal daily throughput of "
        f"\u20b9{baseline_daily:,.0f}. Splitting a large movement into smaller "
        f"legs does not change the total."
    )

    return _RuleHit(
        "VOLUME_SPIKE", points, severity, reason, 0.30,
        {
            "window_outflow": round(total, 2),
            "leg_count": len(outgoing),
            "baseline_daily": round(baseline_daily, 2),
            "baseline_anchor": anchor,
            "ratio": round(ratio, 2),
            "largest_leg": round(largest_leg, 2),
            "largest_leg_share": round(largest_leg / total, 4),
            "window_hours": VOLUME_WINDOW_HOURS,
        },
        confidence=_confidence(len(outgoing), VOLUME_MIN_LEGS + 3),
        transaction_ids=sorted(t.transaction_id for t in outgoing),
    )


def _rule_baseline_shift(ctx: RiskContext) -> Optional[_RuleHit]:
    """
    The account's normal transaction size has structurally moved upward.

    Catches both slow escalation (1k -> 2k -> 5k -> 15k -> 30k, where no single
    step is anomalous against the step before it) and deliberate priming, where
    an attacker runs transfers purely to raise the median before the real
    movement. Both look identical from inside the recent window; both stand out
    against what the account did months ago.
    """
    amounts = [_to_float(t.amount) for t in ctx.recent_transactions]

    if len(amounts) < BASELINE_SHIFT_MIN_RECENT:
        return None

    prior_average = ctx.related_data.get("prior_activity_average")

    # Without a pre-window anchor there is nothing to have shifted from.
    if not isinstance(prior_average, (int, float)) or prior_average <= 0:
        return None

    recent_median = median(amounts)

    # Small accounts drift for boring reasons; only judge meaningful sums.
    if recent_median < BASELINE_SHIFT_MIN_RECENT_MEDIAN:
        return None

    ratio = recent_median / float(prior_average)

    if ratio < BASELINE_SHIFT_RATIO:
        return None

    points = BASELINE_SHIFT_POINTS

    severity = (
        RiskLevel.HIGH if ratio >= BASELINE_SHIFT_RATIO * 2 else RiskLevel.MEDIUM
    )

    reason = (
        f"This account's typical transfer has moved from \u20b9{prior_average:,.0f} "
        f"to \u20b9{recent_median:,.0f} ({ratio:.1f}x) compared with its own earlier "
        f"history - the behaviour itself changed, not just one transaction."
    )

    return _RuleHit(
        "BASELINE_SHIFT", points, severity, reason, 0.25,
        {
            "recent_median": round(recent_median, 2),
            "pre_window_average": round(float(prior_average), 2),
            "ratio": round(ratio, 2),
            "recent_count": len(amounts),
        },
        confidence=_confidence(len(amounts), BASELINE_SHIFT_MIN_RECENT + 4),
        transaction_ids=sorted(t.transaction_id for t in ctx.recent_transactions)[:10],
    )


# --------------------------------------------------------------------------- #
# The engine
# --------------------------------------------------------------------------- #

_RULE_FUNCS = (
    _rule_large_transaction,
    _rule_new_device,
    _rule_new_location,
    _rule_new_receiver,
    _rule_high_velocity,
    _rule_structuring,
    _rule_new_account,
    _rule_rapid_movement,
    _rule_burst_activity,
    _rule_fan_in,
    _rule_fan_out,
    _rule_pass_through,
    _rule_dormant_activation,
    _rule_device_reuse,
    _rule_location_anomaly,
    _rule_failed_burst,
    _rule_circular_flow,
    _rule_volume_spike,
    _rule_baseline_shift,
)

_RULE_CODES = [
    "LARGE_TRANSACTION", "NEW_DEVICE", "NEW_LOCATION", "NEW_RECEIVER",
    "HIGH_VELOCITY", "STRUCTURING", "NEW_ACCOUNT",
    "RAPID_MOVEMENT", "BURST_ACTIVITY", "FAN_IN", "FAN_OUT", "PASS_THROUGH",
    "DORMANT_ACTIVATION", "DEVICE_REUSE", "LOCATION_ANOMALY", "FAILED_BURST",
    "CIRCULAR_FLOW", "VOLUME_SPIKE", "BASELINE_SHIFT",
]

# Rules in the same family read the same underlying evidence. Grouping them
# is what stops one behaviour from being scored twice at full weight.
_RULE_FAMILY = {
    "LARGE_TRANSACTION": "amount",
    "STRUCTURING": "structuring",
    "HIGH_VELOCITY": "velocity",
    "BURST_ACTIVITY": "velocity",
    "RAPID_MOVEMENT": "flow",
    "PASS_THROUGH": "flow",
    "NEW_RECEIVER": "counterparty_novelty",
    "FAN_IN": "counterparty",
    "FAN_OUT": "counterparty",
    "CIRCULAR_FLOW": "counterparty",
    "NEW_DEVICE": "device",
    "DEVICE_REUSE": "device",
    "NEW_LOCATION": "location",
    "LOCATION_ANOMALY": "location",
    "NEW_ACCOUNT": "account_age",
    "DORMANT_ACTIVATION": "dormancy",
    "FAILED_BURST": "transaction_quality",
    "VOLUME_SPIKE": "volume",
    "BASELINE_SHIFT": "drift",
}

_RULE_NAME = {
    "LARGE_TRANSACTION": "Large transaction versus account baseline",
    "NEW_DEVICE": "First-seen device",
    "NEW_LOCATION": "First-seen location",
    "NEW_RECEIVER": "First-time receiver",
    "HIGH_VELOCITY": "High transaction velocity",
    "STRUCTURING": "Possible structuring / threshold avoidance",
    "NEW_ACCOUNT": "Newly opened account",
    "RAPID_MOVEMENT": "Rapid movement of funds",
    "BURST_ACTIVITY": "Burst of transactions",
    "FAN_IN": "Many-to-one inflow concentration",
    "FAN_OUT": "One-to-many outflow distribution",
    "PASS_THROUGH": "Pass-through / transit account behaviour",
    "DORMANT_ACTIVATION": "Dormant account reactivation",
    "DEVICE_REUSE": "Device shared across accounts",
    "LOCATION_ANOMALY": "Implausible location switching",
    "FAILED_BURST": "Cluster of failed or reversed transactions",
    "CIRCULAR_FLOW": "Circular / reciprocal fund flow",
    "VOLUME_SPIKE": "Cumulative outflow spike",
    "BASELINE_SHIFT": "Structural change in spending baseline",
}

# The seven original rules predate per-hit confidence; these are their
# standing evidence-strength values.
_RULE_BASE_CONFIDENCE = {
    "LARGE_TRANSACTION": 0.70,
    "NEW_DEVICE": 0.60,
    "NEW_LOCATION": 0.50,
    "NEW_RECEIVER": 0.40,
    "HIGH_VELOCITY": 0.70,
    "STRUCTURING": 0.75,
    "NEW_ACCOUNT": 0.60,
}

_DEFAULT_CONFIDENCE = 0.50


def _normalize_context(context: RiskContext) -> RiskContext:
    """
    Make the history safe to score: drop repeated rows and any copy of the
    transaction under analysis, then order it deterministically. Without
    this, a duplicated row would let one piece of evidence be counted twice.
    """
    seen = set()
    unique = []

    for t in context.recent_transactions:
        if t.transaction_id == context.transaction.transaction_id:
            continue
        if t.transaction_id in seen:
            continue
        seen.add(t.transaction_id)
        unique.append(t)

    unique.sort(
        key=lambda t: (_naive(t.transaction_timestamp), t.transaction_id),
        reverse=True,
    )

    return context.model_copy(update={"recent_transactions": unique})


def _decayed_total(family_totals: dict) -> float:
    """Independent families stack, strongest first, with a decay per rank."""
    ranked = sorted(family_totals.items(), key=lambda kv: (-kv[1], kv[0]))

    total = 0.0
    for index, (_family, points) in enumerate(ranked):
        total += points * (FAMILY_ACROSS_DECAY ** index)

    return total


def _aggregate_score(hits: list) -> tuple:
    """
    Combine rule points without double-counting, and without letting context
    masquerade as evidence.

    Three layers:

    1. Within a family the strongest rule counts in full and the rest are
       discounted - they are re-reading the same evidence.
    2. Families stack with a rank decay, so piling on weak extra families
       cannot manufacture a CRITICAL.
    3. Behavioural families (what the money did) carry the score. Context
       families (new account, shared device, new city) only amplify real
       behavioural evidence, and on their own are capped below HIGH.

    Layer 3 is what stops a legitimate new customer on a family phone from
    being scored the same as a mule.
    """
    if not hits:
        return 0.0, {}, {}

    by_family = {}

    for h in hits:
        family = _RULE_FAMILY.get(h.code, h.code.lower())
        by_family.setdefault(family, []).append(h.points)

    family_totals = {}

    for family, points in by_family.items():
        ordered = sorted(points, reverse=True)
        family_totals[family] = round(
            ordered[0] + FAMILY_WITHIN_DECAY * sum(ordered[1:]), 4
        )

    behavioural_families = {
        f: v for f, v in family_totals.items() if f not in CONTEXT_FAMILIES
    }
    context_families = {
        f: v for f, v in family_totals.items() if f in CONTEXT_FAMILIES
    }

    behavioural_total = _decayed_total(behavioural_families)
    context_total = _decayed_total(context_families)

    if behavioural_total <= 0.0:
        # Nothing abnormal happened with the money. Context alone is a reason
        # to look, never a reason to call it high risk.
        context_applied = min(CONTEXT_ONLY_CAP, context_total)
        score = context_applied
        capped = context_total > CONTEXT_ONLY_CAP
    else:
        context_applied = min(
            context_total * CONTEXT_WEIGHT,
            behavioural_total * CONTEXT_MAX_SHARE,
        )
        score = behavioural_total + context_applied
        capped = (
            context_total * CONTEXT_WEIGHT
            > behavioural_total * CONTEXT_MAX_SHARE
        )

    tiers = {
        "behavioural_total": round(behavioural_total, 2),
        "context_total": round(context_total, 2),
        "context_applied": round(context_applied, 2),
        "context_capped": capped,
        "behavioural_families": sorted(behavioural_families),
        "context_families": sorted(context_families),
    }

    return min(100.0, score), family_totals, tiers


def _combine_anomaly(values) -> float:
    """
    Noisy-OR: each signal removes part of the remaining "looks normal" mass.
    Bounded at 1.0 by construction and independent of evaluation order.
    """
    remaining = 1.0
    for value in values:
        remaining *= 1.0 - max(0.0, min(1.0, value))
    return 1.0 - remaining


def _hit_confidence(hit: _RuleHit) -> float:
    if hit.confidence is not None:
        return hit.confidence
    return _RULE_BASE_CONFIDENCE.get(hit.code, _DEFAULT_CONFIDENCE)


class RuleBasedRiskEngine(RiskEngine):
    """Behavioral, explainable risk engine. No ML, no database."""

    def analyze(self, context: RiskContext) -> RiskResult:
        context = _normalize_context(context)

        hits = [hit for hit in (fn(context) for fn in _RULE_FUNCS) if hit is not None]

        # Strongest first, ties broken on code, so identical input always
        # produces identical output.
        hits.sort(key=lambda h: (-h.points, h.code))

        risk_score, family_totals, tiers = _aggregate_score(hits)
        risk_level = _level_from_score(risk_score)
        mule_probability = _logistic(risk_score)
        anomaly_score = _combine_anomaly(h.anomaly for h in hits)

        triggered = [h.code for h in hits]
        reasons = [h.reason for h in hits]

        account_id = context.account.account_id
        current_id = context.transaction.transaction_id

        findings = [
            {
                "rule_id": h.code,
                "rule_name": _RULE_NAME.get(h.code, h.code),
                "family": _RULE_FAMILY.get(h.code, h.code.lower()),
                "severity": h.severity.value,
                "score_contribution": round(h.points, 2),
                "confidence": round(_hit_confidence(h), 2),
                "account_id": account_id,
                "transaction_ids": h.transaction_ids or [current_id],
                "explanation": h.reason,
                "evidence": h.details,
            }
            for h in hits
        ]

        explanation = {
            "engine": "rule_based",
            "reasons": reasons or ["No behavioral risk rules triggered."],
            "rules_evaluated": _RULE_CODES,
            "triggered_rules": triggered,
            "signals": {h.code: h.details for h in hits},
            "score_breakdown": {h.code: round(h.points, 1) for h in hits},
            "family_breakdown": family_totals,
            "tier_breakdown": tiers,
            "findings": findings,
            "score_model": {
                "method": "two-tier family-discounted additive",
                "tiers": (
                    "behavioural evidence carries the score; context "
                    "(new account, shared device, new location) amplifies it "
                    "but is capped at %.0f on its own"
                ) % CONTEXT_ONLY_CAP,
                "context_weight": CONTEXT_WEIGHT,
                "context_max_share": CONTEXT_MAX_SHARE,
                # family_breakdown holds combined points per evidence family
                # BEFORE the across-family decay and the 0-100 cap. Those
                # values deliberately do not sum to risk_score.
                "family_breakdown_is": (
                    "combined points per evidence family, before the "
                    "across-family decay and the 0-100 cap; these values "
                    "do not sum to risk_score"
                ),
                "within_family_decay": FAMILY_WITHIN_DECAY,
                "across_family_decay": FAMILY_ACROSS_DECAY,
                "thresholds": {
                    "medium": MEDIUM_MIN,
                    "high": HIGH_MIN,
                    "critical": CRITICAL_MIN,
                },
            },
        }

        detected_patterns = [
            DetectedPattern(
                code=h.code,
                rule_id=h.code,
                rule_name=_RULE_NAME.get(h.code, h.code),
                description=h.reason,
                severity=h.severity,
                score_contribution=round(h.points, 2),
                confidence=round(_hit_confidence(h), 2),
                account_id=account_id,
                transaction_ids=h.transaction_ids or [current_id],
                evidence=h.details,
            )
            for h in hits
        ]

        return RiskResult(
            anomaly_score=round(anomaly_score, 4),
            risk_score=round(risk_score, 2),
            mule_probability=round(mule_probability, 4),
            risk_level=risk_level,
            explanation=explanation,
            detected_patterns=detected_patterns,
            model_version=MODEL_VERSION,
        )
