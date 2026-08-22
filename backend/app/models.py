from __future__ import annotations
 
from datetime import datetime, date, timezone
from decimal import Decimal
from typing import Optional
 
from sqlalchemy import (
    String,
    Text,
    Date,
    DateTime,
    Numeric,
    Boolean,
    ForeignKey,
    Enum as SQLEnum,
    JSON,
    Index,
)
from sqlalchemy.dialects.mysql import BIGINT
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
    relationship,
)
 
 
def utcnow() -> datetime:
    """Timezone-aware UTC now. Used for all default timestamps."""
    return datetime.now(timezone.utc)
 
 
# Reusable unsigned BIGINT for all surrogate primary keys / foreign keys.
PK = BIGINT(unsigned=True)
 
 
class Base(DeclarativeBase):
    pass
 
 
# ---------------------------------------------------------------------------
# users
# ---------------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"
 
    user_id: Mapped[int] = mapped_column(PK, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    role: Mapped[str] = mapped_column(
        SQLEnum("investigator", "analyst", "admin", name="user_role_enum"),
        nullable=False,
        default="investigator",
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
 
    # One investigator files many feedback entries.
    feedback_entries: Mapped[list["InvestigatorFeedback"]] = relationship(
        back_populates="investigator"
    )
 
 
# ---------------------------------------------------------------------------
# accounts
# ---------------------------------------------------------------------------
class Account(Base):
    __tablename__ = "accounts"
 
    account_id: Mapped[int] = mapped_column(PK, primary_key=True, autoincrement=True)
    # Store a tokenized/hashed value here, NOT the raw account number.
    account_number: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    account_holder_name: Mapped[str] = mapped_column(String(255), nullable=False)
    account_type: Mapped[str] = mapped_column(
        SQLEnum("savings", "current", "wallet", name="account_type_enum"),
        nullable=False,
    )
    ifsc_code: Mapped[Optional[str]] = mapped_column(String(11))
    bank_name: Mapped[Optional[str]] = mapped_column(String(100))
    current_balance: Mapped[Decimal] = mapped_column(
        Numeric(15, 2), default=Decimal("0.00"), nullable=False
    )
    kyc_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[str] = mapped_column(
        SQLEnum(
            "active", "frozen", "closed", "under_review", name="account_status_enum"
        ),
        default="active",
        nullable=False,
        index=True,
    )
    date_opened: Mapped[Optional[date]] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )
 
    # Two separate relationships because an account can be sender OR receiver.
    sent_transactions: Mapped[list["Transaction"]] = relationship(
        back_populates="sender_account",
        foreign_keys="Transaction.sender_account_id",
    )
    received_transactions: Mapped[list["Transaction"]] = relationship(
        back_populates="receiver_account",
        foreign_keys="Transaction.receiver_account_id",
    )
    risk_scores: Mapped[list["RiskScore"]] = relationship(back_populates="account")
    fraud_alerts: Mapped[list["FraudAlert"]] = relationship(back_populates="account")
 
 
# ---------------------------------------------------------------------------
# transactions
# ---------------------------------------------------------------------------
class Transaction(Base):
    __tablename__ = "transactions"
 
    transaction_id: Mapped[int] = mapped_column(
        PK, primary_key=True, autoincrement=True
    )
    # Both nullable: money may come from / go to an untracked external account.
    sender_account_id: Mapped[Optional[int]] = mapped_column(
        PK, ForeignKey("accounts.account_id", ondelete="SET NULL"), index=True
    )
    receiver_account_id: Mapped[Optional[int]] = mapped_column(
        PK, ForeignKey("accounts.account_id", ondelete="SET NULL"), index=True
    )
    external_account_ref: Mapped[Optional[str]] = mapped_column(String(64))
    amount: Mapped[Decimal] = mapped_column(Numeric(15, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    transaction_type: Mapped[str] = mapped_column(
        SQLEnum(
            "transfer", "deposit", "withdrawal", "payment",
            name="transaction_type_enum",
        ),
        nullable=False,
    )
    channel: Mapped[Optional[str]] = mapped_column(
        SQLEnum(
            "UPI", "NEFT", "IMPS", "RTGS", "card", "atm", "cash",
            name="transaction_channel_enum",
        )
    )
    status: Mapped[str] = mapped_column(
        SQLEnum(
            "completed", "pending", "failed", "reversed",
            name="transaction_status_enum",
        ),
        default="completed",
        nullable=False,
        index=True,
    )
    transaction_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    description: Mapped[Optional[str]] = mapped_column(String(255))
    device_id: Mapped[Optional[str]] = mapped_column(String(128), index=True)
    device_fingerprint: Mapped[Optional[str]] = mapped_column(String(255), index=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45))
    location: Mapped[Optional[str]] = mapped_column(String(100))
    merchant_category: Mapped[Optional[str]] = mapped_column(String(100))
    anomaly_score: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 4))
    is_flagged: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
 
    sender_account: Mapped[Optional["Account"]] = relationship(
        back_populates="sent_transactions",
        foreign_keys=[sender_account_id],
    )
    receiver_account: Mapped[Optional["Account"]] = relationship(
        back_populates="received_transactions",
        foreign_keys=[receiver_account_id],
    )
    fraud_alerts: Mapped[list["FraudAlert"]] = relationship(
        back_populates="transaction"
    )
 
    # Composite indexes for "this account's transactions over time" queries.
    __table_args__ = (
        Index("ix_txn_sender_time", "sender_account_id", "transaction_timestamp"),
        Index("ix_txn_receiver_time", "receiver_account_id", "transaction_timestamp"),
    )
 
 
# ---------------------------------------------------------------------------
# risk_scores
# ---------------------------------------------------------------------------
class RiskScore(Base):
    __tablename__ = "risk_scores"
 
    risk_score_id: Mapped[int] = mapped_column(
        PK, primary_key=True, autoincrement=True
    )
    account_id: Mapped[int] = mapped_column(
        PK,
        ForeignKey("accounts.account_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    risk_score: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    mule_probability: Mapped[Optional[Decimal]] = mapped_column(Numeric(5, 4))
    risk_level: Mapped[str] = mapped_column(
        SQLEnum("low", "medium", "high", "critical", name="risk_level_enum"),
        nullable=False,
        index=True,
    )
    model_version: Mapped[Optional[str]] = mapped_column(String(50))
    # Top contributing features / reasons (explainable AI). Kept as JSON.
    explanation: Mapped[Optional[dict]] = mapped_column(JSON)
    scored_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
 
    account: Mapped["Account"] = relationship(back_populates="risk_scores")
    fraud_alerts: Mapped[list["FraudAlert"]] = relationship(
        back_populates="risk_score"
    )
 
    # Fast lookup of an account's score history / latest score.
    __table_args__ = (
        Index("ix_risk_account_scored", "account_id", "scored_at"),
    )
 
 
# ---------------------------------------------------------------------------
# fraud_alerts
# ---------------------------------------------------------------------------
class FraudAlert(Base):
    __tablename__ = "fraud_alerts"
 
    alert_id: Mapped[int] = mapped_column(PK, primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(
        PK,
        ForeignKey("accounts.account_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Nullable: an alert may be triggered by a transaction, a score, or neither.
    transaction_id: Mapped[Optional[int]] = mapped_column(
        PK, ForeignKey("transactions.transaction_id", ondelete="SET NULL")
    )
    risk_score_id: Mapped[Optional[int]] = mapped_column(
        PK, ForeignKey("risk_scores.risk_score_id", ondelete="SET NULL")
    )
    alert_type: Mapped[str] = mapped_column(
        SQLEnum(
            "mule_account", "anomalous_transaction", "structuring",
            "rapid_movement", "network_pattern",
            name="alert_type_enum",
        ),
        nullable=False,
        index=True,
    )
    severity: Mapped[str] = mapped_column(
        SQLEnum("low", "medium", "high", "critical", name="alert_severity_enum"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        SQLEnum(
            "open", "investigating", "confirmed_fraud", "false_positive", "resolved",
            name="alert_status_enum",
        ),
        default="open",
        nullable=False,
        index=True,
    )
    reason: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False, index=True
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
 
    account: Mapped["Account"] = relationship(back_populates="fraud_alerts")
    transaction: Mapped[Optional["Transaction"]] = relationship(
        back_populates="fraud_alerts"
    )
    risk_score: Mapped[Optional["RiskScore"]] = relationship(
        back_populates="fraud_alerts"
    )
    feedback_entries: Mapped[list["InvestigatorFeedback"]] = relationship(
        back_populates="alert"
    )
 
    # Common dashboard query: open alerts for an account.
    __table_args__ = (
        Index("ix_alert_account_status", "account_id", "status"),
    )
 
 
# ---------------------------------------------------------------------------
# investigator_feedback
# ---------------------------------------------------------------------------
class InvestigatorFeedback(Base):
    __tablename__ = "investigator_feedback"
 
    feedback_id: Mapped[int] = mapped_column(PK, primary_key=True, autoincrement=True)
    alert_id: Mapped[int] = mapped_column(
        PK,
        ForeignKey("fraud_alerts.alert_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    investigator_id: Mapped[int] = mapped_column(
        PK,
        ForeignKey("users.user_id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    # This verdict becomes your ML training label later.
    verdict: Mapped[str] = mapped_column(
        SQLEnum(
            "confirmed_fraud", "false_positive", "inconclusive",
            name="feedback_verdict_enum",
        ),
        nullable=False,
        index=True,
    )
    action_taken: Mapped[Optional[str]] = mapped_column(
        SQLEnum(
            "none", "account_frozen", "reported", "escalated", "dismissed",
            name="feedback_action_enum",
        )
    )
    notes: Mapped[Optional[str]] = mapped_column(Text)
    reviewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
 
    alert: Mapped["FraudAlert"] = relationship(back_populates="feedback_entries")
    investigator: Mapped["User"] = relationship(back_populates="feedback_entries")
 