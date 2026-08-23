"""
API-level tests exercising the real application against the configured
database.

These are integration tests: they need DATABASE_URL to point at a reachable
MySQL instance. When the database is unavailable the whole module skips, so
the pure engine tests still run in any environment.
"""
from datetime import datetime, timedelta

import pytest

try:
    from sqlalchemy import text
    from starlette.testclient import TestClient

    from app.database import engine
    from app.main import app

    with engine.connect() as _conn:
        _conn.execute(text("SELECT 1"))

    DATABASE_AVAILABLE = True
    SKIP_REASON = ""
except Exception as exc:  # pragma: no cover - environment dependent
    DATABASE_AVAILABLE = False
    SKIP_REASON = f"database unavailable: {exc}"
    app = None

pytestmark = pytest.mark.skipif(not DATABASE_AVAILABLE, reason=SKIP_REASON)


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def account_id(client):
    """A dedicated account so these tests never depend on demo data."""
    suffix = datetime.now().strftime("%H%M%S%f")[:10]

    response = client.post(
        "/api/accounts/",
        json={
            "account_number": f"TEST{suffix}",
            "account_holder_name": "API Test Account",
            "account_type": "savings",
            "ifsc_code": "HDFC0001234",
            "bank_name": "Test Bank",
            "current_balance": "25000.00",
            "kyc_verified": True,
            "status": "active",
            "date_opened": "2024-01-15",
        },
    )

    assert response.status_code == 201, response.text
    return response.json()["account_id"]


@pytest.fixture(scope="module")
def counterparty_id(client):
    suffix = datetime.now().strftime("%H%M%S%f")[:10]

    response = client.post(
        "/api/accounts/",
        json={
            "account_number": f"CPTY{suffix}",
            "account_holder_name": "API Counterparty",
            "account_type": "current",
        },
    )

    assert response.status_code == 201, response.text
    return response.json()["account_id"]


# --------------------------------------------------------------------------- #
# Health / meta
# --------------------------------------------------------------------------- #


def test_health(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}


def test_root(client):
    response = client.get("/")

    assert response.status_code == 200
    assert "version" in response.json()


def test_openapi_describes_the_api(client):
    schema = client.get("/openapi.json").json()

    for path in [
        "/api/accounts/",
        "/api/transactions/",
        "/api/alerts/",
        "/api/dashboard/stats",
        "/api/risk/analyze/{transaction_id}",
    ]:
        assert path in schema["paths"], f"{path} missing from OpenAPI"


def test_responses_declare_utf8(client):
    response = client.get("/health")

    assert "charset=utf-8" in response.headers["content-type"].lower()


# --------------------------------------------------------------------------- #
# Accounts
# --------------------------------------------------------------------------- #


def test_create_and_get_account(client, account_id):
    response = client.get(f"/api/accounts/{account_id}")

    assert response.status_code == 200
    body = response.json()
    assert body["account_holder_name"] == "API Test Account"
    assert body["account_type"] == "savings"


def test_list_accounts(client, account_id):
    response = client.get("/api/accounts/?limit=100")

    assert response.status_code == 200
    assert any(a["account_id"] == account_id for a in response.json())


def test_unknown_account_returns_404(client):
    response = client.get("/api/accounts/99999999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Account not found"}


def test_duplicate_account_number_is_rejected(client, account_id):
    existing = client.get(f"/api/accounts/{account_id}").json()

    response = client.post(
        "/api/accounts/",
        json={
            "account_number": existing["account_number"],
            "account_holder_name": "Duplicate",
            "account_type": "savings",
        },
    )

    assert response.status_code == 409


def test_invalid_ifsc_is_rejected(client):
    response = client.post(
        "/api/accounts/",
        json={
            "account_number": "BADIFSC001",
            "account_holder_name": "Bad IFSC",
            "account_type": "savings",
            "ifsc_code": "NOTANIFSC",
        },
    )

    assert response.status_code == 422


def test_invalid_account_type_is_rejected(client):
    response = client.post(
        "/api/accounts/",
        json={
            "account_number": "BADTYPE001",
            "account_holder_name": "Bad Type",
            "account_type": "crypto_vault",
        },
    )

    assert response.status_code == 422


# --------------------------------------------------------------------------- #
# Transactions
# --------------------------------------------------------------------------- #


def _txn_payload(sender, receiver, **overrides):
    payload = {
        "sender_account_id": sender,
        "receiver_account_id": receiver,
        "amount": "1500.00",
        "currency": "INR",
        "transaction_type": "transfer",
        "channel": "UPI",
        "status": "completed",
        "transaction_timestamp": datetime.now().isoformat(),
        "description": "API test transfer",
        "device_fingerprint": "FP-APITEST",
        "location": "Mumbai",
    }
    payload.update(overrides)
    return payload


def test_create_and_get_transaction(client, account_id, counterparty_id):
    response = client.post(
        "/api/transactions/", json=_txn_payload(account_id, counterparty_id)
    )

    assert response.status_code == 201, response.text
    txn_id = response.json()["transaction_id"]

    fetched = client.get(f"/api/transactions/{txn_id}")

    assert fetched.status_code == 200
    assert fetched.json()["transaction_id"] == txn_id


def test_list_transactions_filtered_by_account(client, account_id):
    response = client.get(f"/api/transactions/?account_id={account_id}")

    assert response.status_code == 200
    for txn in response.json():
        assert account_id in (
            txn["sender_account_id"],
            txn["receiver_account_id"],
        )


def test_unknown_transaction_returns_404(client):
    response = client.get("/api/transactions/99999999")

    assert response.status_code == 404


@pytest.mark.parametrize("amount", ["-500.00", "0"])
def test_non_positive_amounts_are_rejected(client, account_id, counterparty_id, amount):
    response = client.post(
        "/api/transactions/",
        json=_txn_payload(account_id, counterparty_id, amount=amount),
    )

    assert response.status_code == 422


def test_missing_required_field_is_rejected(client, account_id, counterparty_id):
    payload = _txn_payload(account_id, counterparty_id)
    del payload["amount"]

    assert client.post("/api/transactions/", json=payload).status_code == 422


def test_same_sender_and_receiver_is_rejected(client, account_id):
    response = client.post(
        "/api/transactions/", json=_txn_payload(account_id, account_id)
    )

    assert response.status_code == 422


def test_one_sided_transaction_needs_external_reference(client, account_id):
    response = client.post(
        "/api/transactions/", json=_txn_payload(account_id, None)
    )

    assert response.status_code == 422

    ok = client.post(
        "/api/transactions/",
        json=_txn_payload(account_id, None, external_account_ref="EXT-REF-1"),
    )

    assert ok.status_code == 201


def test_nonexistent_counterparty_returns_404(client, account_id):
    response = client.post(
        "/api/transactions/", json=_txn_payload(99999999, account_id)
    )

    assert response.status_code == 404


def test_invalid_timestamp_is_rejected(client, account_id, counterparty_id):
    response = client.post(
        "/api/transactions/",
        json=_txn_payload(
            account_id, counterparty_id, transaction_timestamp="not-a-date"
        ),
    )

    assert response.status_code == 422


def test_malformed_json_is_rejected(client):
    response = client.post(
        "/api/transactions/",
        content=b"{not valid json",
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 422


def test_errors_never_leak_internals(client):
    body = client.get("/api/accounts/99999999").text

    for leak in ("Traceback", "SELECT ", "sqlalchemy", "site-packages"):
        assert leak not in body


# --------------------------------------------------------------------------- #
# Risk analysis and alert idempotency
# --------------------------------------------------------------------------- #


@pytest.fixture(scope="module")
def suspicious_transaction(client, account_id, counterparty_id):
    """A large transfer against a thin baseline, so rules actually fire."""
    for i in range(4):
        client.post(
            "/api/transactions/",
            json=_txn_payload(
                account_id,
                counterparty_id,
                amount="900.00",
                transaction_timestamp=(
                    datetime.now() - timedelta(days=i + 2)
                ).isoformat(),
            ),
        )

    response = client.post(
        "/api/transactions/",
        json=_txn_payload(
            account_id,
            counterparty_id,
            amount="180000.00",
            channel="IMPS",
            device_fingerprint="FP-APITEST-NEW",
            location="Chennai",
        ),
    )

    assert response.status_code == 201
    return response.json()["transaction_id"]


def test_risk_analysis_returns_a_valid_payload(client, suspicious_transaction):
    response = client.post(f"/api/risk/analyze/{suspicious_transaction}")

    assert response.status_code == 200
    body = response.json()

    assert 0 <= body["risk_score"] <= 100
    assert 0 <= body["mule_probability"] <= 1
    assert 0 <= body["anomaly_score"] <= 1
    assert body["risk_level"] in ("low", "medium", "high", "critical")
    assert body["model_version"]
    assert body["detected_patterns"]

    for pattern in body["detected_patterns"]:
        assert pattern["rule_id"]
        assert pattern["rule_name"]
        assert pattern["evidence"]
        assert pattern["severity"] in ("low", "medium", "high", "critical")
        assert pattern["score_contribution"] is not None
        assert 0 <= pattern["confidence"] <= 1


def test_risk_level_matches_the_documented_mapping(client, suspicious_transaction):
    body = client.post(f"/api/risk/analyze/{suspicious_transaction}").json()

    score = body["risk_score"]
    expected = (
        "critical" if score >= 75
        else "high" if score >= 50
        else "medium" if score >= 25
        else "low"
    )

    assert body["risk_level"] == expected


def test_analysis_is_deterministic(client, suspicious_transaction):
    first = client.post(f"/api/risk/analyze/{suspicious_transaction}").json()
    second = client.post(f"/api/risk/analyze/{suspicious_transaction}").json()

    assert first["risk_score"] == second["risk_score"]
    assert first["risk_level"] == second["risk_level"]
    assert (
        [p["code"] for p in first["detected_patterns"]]
        == [p["code"] for p in second["detected_patterns"]]
    )


def test_repeated_analysis_does_not_duplicate_alerts(
    client, account_id, suspicious_transaction
):
    """The bug this release exists to fix."""
    client.post(f"/api/risk/analyze/{suspicious_transaction}")

    before = client.get(f"/api/accounts/{account_id}/alerts").json()
    before_ids = sorted(a["alert_id"] for a in before)

    for _ in range(4):
        client.post(f"/api/risk/analyze/{suspicious_transaction}")

    after = client.get(f"/api/accounts/{account_id}/alerts").json()
    after_ids = sorted(a["alert_id"] for a in after)

    assert before_ids == after_ids, (
        f"repeated analysis created new alerts: {before_ids} -> {after_ids}"
    )


def test_alerts_carry_one_row_per_active_type(client, account_id):
    alerts = client.get(f"/api/accounts/{account_id}/alerts").json()

    active = [a for a in alerts if a["status"] in ("open", "investigating")]
    account_scoped = [
        a["alert_type"]
        for a in active
        if a["alert_type"] in ("mule_account", "network_pattern")
    ]

    assert len(account_scoped) == len(set(account_scoped))


def test_analysis_of_unknown_transaction_returns_404(client):
    assert client.post("/api/risk/analyze/99999999").status_code == 404


# --------------------------------------------------------------------------- #
# Alert lifecycle
# --------------------------------------------------------------------------- #


def test_alert_listing_and_filters(client):
    response = client.get("/api/alerts/?limit=20")

    assert response.status_code == 200

    open_only = client.get("/api/alerts/?status=open&limit=20").json()

    assert all(a["status"] == "open" for a in open_only)


def test_alert_status_lifecycle(client, account_id):
    alerts = client.get(f"/api/accounts/{account_id}/alerts").json()

    if not alerts:
        pytest.skip("no alert available for this account")

    alert_id = alerts[0]["alert_id"]

    investigating = client.patch(
        f"/api/alerts/{alert_id}/status", json={"status": "investigating"}
    ).json()
    assert investigating["status"] == "investigating"

    resolved = client.patch(
        f"/api/alerts/{alert_id}/status",
        json={"status": "resolved", "note": "checked"},
    ).json()
    assert resolved["status"] == "resolved"
    assert resolved["resolved_at"] is not None

    reopened = client.patch(
        f"/api/alerts/{alert_id}/status", json={"status": "open"}
    ).json()
    assert reopened["resolved_at"] is None


def test_invalid_alert_status_is_rejected(client, account_id):
    alerts = client.get(f"/api/accounts/{account_id}/alerts").json()

    if not alerts:
        pytest.skip("no alert available for this account")

    response = client.patch(
        f"/api/alerts/{alerts[0]['alert_id']}/status", json={"status": "banana"}
    )

    assert response.status_code == 422


def test_unknown_alert_returns_404(client):
    assert client.get("/api/alerts/99999999").status_code == 404


# --------------------------------------------------------------------------- #
# Investigation and dashboard
# --------------------------------------------------------------------------- #


def test_account_investigation_is_populated(client, account_id):
    response = client.get(f"/api/accounts/{account_id}/investigation")

    assert response.status_code == 200
    body = response.json()

    assert body["account"]["account_id"] == account_id
    assert body["statistics"]["transaction_count"] > 0
    assert isinstance(body["transactions"], list)
    assert isinstance(body["counterparties"], list)
    assert isinstance(body["devices"], list)
    assert isinstance(body["locations"], list)
    assert isinstance(body["mule_indicators"], dict)
    assert len(body["summary"]) > 40
    assert body["risk_score"] is not None


def test_investigation_of_unknown_account_returns_404(client):
    assert client.get("/api/accounts/99999999/investigation").status_code == 404


def test_dashboard_statistics_are_real(client):
    response = client.get("/api/dashboard/stats")

    assert response.status_code == 200
    stats = response.json()

    for key in [
        "total_accounts",
        "total_transactions",
        "total_transaction_volume",
        "high_risk_accounts",
        "mule_accounts",
        "average_risk_score",
        "open_alerts",
        "resolved_alerts",
        "critical_alerts",
        "risk_distribution",
        "alert_distribution",
        "alert_type_distribution",
    ]:
        assert key in stats, f"{key} missing from dashboard stats"

    assert stats["total_accounts"] > 0
    assert stats["total_transactions"] > 0

    distribution = stats["risk_distribution"]
    assert set(distribution) == {"low", "medium", "high", "critical"}

    if stats["scored_accounts"]:
        assert abs(sum(distribution.values()) - 100.0) < 1.0


# --------------------------------------------------------------------------- #
# Encoding
# --------------------------------------------------------------------------- #


def test_rupee_symbol_survives_the_round_trip(client, suspicious_transaction):
    """
    The rupee sign must arrive intact as UTF-8, not as mojibake.

    The raw body is decoded explicitly so this fails if the bytes are wrong,
    not merely if a client guesses the encoding correctly.
    """
    response = client.post(f"/api/risk/analyze/{suspicious_transaction}")

    assert "charset=utf-8" in response.headers["content-type"].lower()

    raw = response.content
    assert "₹".encode("utf-8") in raw, "rupee sign not UTF-8 encoded in body"

    text_body = raw.decode("utf-8")
    assert "₹" in text_body
    assert "â‚¹" not in text_body, "double-encoded rupee sign in response"
