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
)
 
MODEL_VERSION = "rule_based-0.2.0"
 
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
NEW_ACCOUNT_POINTS_RECENT = 15.0
NEW_ACCOUNT_POINTS_VERY_RECENT = 30.0
 
# mule_probability = logistic(risk_score): a smooth 0..1 S-curve.
MULE_MIDPOINT = 50.0
MULE_STEEPNESS = 0.08
 
 
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
 
def _rule_large_transaction(ctx: RiskContext) -> Optional[_RuleHit]:
    current = _to_float(ctx.transaction.amount)
    amounts = [_to_float(t.amount) for t in ctx.recent_transactions]
 
    if len(amounts) >= LARGE_TXN_MIN_HISTORY:
        baseline = max(median(amounts), 1.0)
        ratio = current / baseline
        if ratio < LARGE_TXN_RATIO_TRIGGER:
            return None
        points = min(
            LARGE_TXN_MAX_POINTS,
            LARGE_TXN_BASE_POINTS
            + (ratio - LARGE_TXN_RATIO_TRIGGER) * LARGE_TXN_POINTS_PER_RATIO,
        )
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
        return _RuleHit(
            "LARGE_TRANSACTION", points, severity, reason, anomaly,
            {
                "current_amount": current,
                "baseline_median": round(baseline, 2),
                "ratio": round(ratio, 2),
                "history_count": len(amounts),
            },
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
)
 
_RULE_CODES = [
    "LARGE_TRANSACTION", "NEW_DEVICE", "NEW_LOCATION", "NEW_RECEIVER",
    "HIGH_VELOCITY", "STRUCTURING", "NEW_ACCOUNT",
]
 
 
class RuleBasedRiskEngine(RiskEngine):
    """Behavioral, explainable risk engine. No ML, no database."""
 
    def analyze(self, context: RiskContext) -> RiskResult:
        hits = [hit for hit in (fn(context) for fn in _RULE_FUNCS) if hit is not None]
 
        # Additive scoring: signals combine. One moderate rule alone cannot
        # reach CRITICAL — that requires enough points from multiple signals.
        risk_score = min(100.0, sum(h.points for h in hits))
        risk_level = _level_from_score(risk_score)
        mule_probability = _logistic(risk_score)
        anomaly_score = min(1.0, sum(h.anomaly for h in hits))
 
        triggered = [h.code for h in hits]
        reasons = [h.reason for h in hits]
 
        explanation = {
            "engine": "rule_based",
            "reasons": reasons or ["No behavioral risk rules triggered."],
            "rules_evaluated": _RULE_CODES,
            "triggered_rules": triggered,
            "signals": {h.code: h.details for h in hits},
            "score_breakdown": {h.code: round(h.points, 1) for h in hits},
        }
 
        detected_patterns = [
            DetectedPattern(code=h.code, description=h.reason, severity=h.severity)
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