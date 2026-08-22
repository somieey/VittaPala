from decimal import Decimal

from ..contracts import (
    RiskContext,
    RiskEngine,
    RiskLevel,
    RiskResult,
    DetectedPattern,
)


class RuleBasedRiskEngine(RiskEngine):

    def analyze(self, context: RiskContext) -> RiskResult:

        transaction = context.transaction
        account = context.account
        history = context.recent_transactions

        risk_score = 0.0
        anomaly_score = 0.0
        mule_probability = 0.0

        patterns = []
        reasons = []

        # ==========================================
        # RULE 1 — Large transaction
        # ==========================================

        if transaction.amount >= Decimal("50000"):
            risk_score += 25
            anomaly_score += 0.25

            patterns.append(
                DetectedPattern(
                    code="large_transaction",
                    description="Transaction amount is unusually large.",
                    severity=RiskLevel.MEDIUM,
                )
            )

            reasons.append(
                "Transaction amount is unusually large."
            )

        elif transaction.amount >= Decimal("20000"):
            risk_score += 10
            anomaly_score += 0.10

            reasons.append(
                "Transaction amount is moderately high."
            )

        # ==========================================
        # RULE 2 — New account
        # ==========================================

        if account.date_opened is not None:

            account_age_days = (
                transaction.transaction_timestamp.date()
                - account.date_opened
            ).days

            if account_age_days <= 7:

                risk_score += 20
                mule_probability += 0.15

                patterns.append(
                    DetectedPattern(
                        code="new_account",
                        description="Transaction originated from a recently opened account.",
                        severity=RiskLevel.MEDIUM,
                    )
                )

                reasons.append(
                    "Account was opened very recently."
                )

        # ==========================================
        # RULE 3 — New device
        # ==========================================

        if transaction.device_fingerprint:

            previous_devices = {
                t.device_fingerprint
                for t in history
                if t.device_fingerprint
            }

            if (
                history
                and transaction.device_fingerprint
                not in previous_devices
            ):

                risk_score += 15
                mule_probability += 0.10

                patterns.append(
                    DetectedPattern(
                        code="new_device",
                        description="Transaction uses a device not seen in recent account history.",
                        severity=RiskLevel.MEDIUM,
                    )
                )

                reasons.append(
                    "Transaction uses a new device."
                )

        # ==========================================
        # RULE 4 — High transaction velocity
        # ==========================================

        if len(history) >= 10:

            risk_score += 20
            anomaly_score += 0.20
            mule_probability += 0.20

            patterns.append(
                DetectedPattern(
                    code="high_velocity",
                    description="Account has a high number of recent transactions.",
                    severity=RiskLevel.HIGH,
                )
            )

            reasons.append(
                "Account shows unusually high transaction velocity."
            )

        # ==========================================
        # RULE 5 — Multiple receivers
        # ==========================================

        receiver_ids = {
            t.transaction_id
            for t in history
        }

        if len(receiver_ids) >= 10:

            risk_score += 10
            mule_probability += 0.10

            reasons.append(
                "Account shows activity across many transactions."
            )

        # ==========================================
        # Clamp scores
        # ==========================================

        risk_score = min(risk_score, 100.0)
        anomaly_score = min(anomaly_score, 1.0)
        mule_probability = min(mule_probability, 1.0)

        # ==========================================
        # Determine risk level
        # ==========================================

        if risk_score >= 80:
            risk_level = RiskLevel.CRITICAL

        elif risk_score >= 60:
            risk_level = RiskLevel.HIGH

        elif risk_score >= 30:
            risk_level = RiskLevel.MEDIUM

        else:
            risk_level = RiskLevel.LOW

        # ==========================================
        # Explanation
        # ==========================================

        explanation = {
            "reasons": reasons,
            "engine": "rule_based",
            "rules_evaluated": [
                "large_transaction",
                "new_account",
                "new_device",
                "high_velocity",
            ],
        }

        return RiskResult(
            anomaly_score=anomaly_score,
            risk_score=risk_score,
            mule_probability=mule_probability,
            risk_level=risk_level,
            explanation=explanation,
            detected_patterns=patterns,
            model_version="rules-v1",
        )