# VittaPala

A fraud and mule-account detection platform. VittaPala ingests bank accounts
and transactions, scores each transaction with an explainable rule-based risk
engine, raises fraud alerts, and gives investigators a dashboard to work from.

Every risk decision is explainable: the API returns the rules that fired, the
evidence behind each one, its score contribution, and a plain-English reason.
There is no black-box model.

---

## Contents

- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment configuration](#environment-configuration)
- [Database setup](#database-setup)
- [Seed demo data](#seed-demo-data)
- [Running the application](#running-the-application)
- [API reference](#api-reference)
- [Risk engine](#risk-engine)
- [Alert behaviour](#alert-behaviour)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## Architecture

```
frontend/  React 18 + Vite + Tailwind
   └── src/services/api.js        single place where the API is called
   └── src/pages/                 Dashboard, Account Investigation, Alert Center

backend/   FastAPI + SQLAlchemy 2 + MySQL
   ├── app/config.py              environment-driven settings
   ├── app/database.py            engine + session (utf8mb4)
   ├── app/models.py              6 tables, Decimal money, indexed FKs
   ├── app/schemas/               Pydantic request/response validation
   ├── app/routers/               accounts, transactions, risk, alerts, dashboard
   ├── app/services/              investigation aggregation
   └── app/risk/
       ├── contracts.py           RiskContext / RiskResult / DetectedPattern
       ├── context_builder.py     turns the DB into scoring evidence
       ├── engines/rule_based.py  19 rules, two-tier scoring
       └── service.py             persistence + alert idempotency
```

Request flow for a risk analysis:

```
POST /api/risk/analyze/{transaction_id}
  -> build_risk_context()   loads the transaction, its account, 30 days of
                            history, plus device-reuse and prior-activity
                            evidence
  -> RuleBasedRiskEngine    runs 19 rules, aggregates by evidence family
  -> service                writes a RiskScore row, updates the transaction,
                            creates or refreshes fraud alerts
```

Money is stored as `NUMERIC(15,2)` and handled as `Decimal` end to end. No
floating point is used for monetary values.

---

## Prerequisites

| Requirement | Version |
|---|---|
| Python | 3.11+ |
| Node.js | 18+ |
| MySQL | 8.0+ |

---

## Installation

### Backend (PowerShell)

```powershell
cd backend
python -m venv venv
.\venv\Scripts\python.exe -m pip install --upgrade pip
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

macOS / Linux:

```bash
cd backend
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
```

### Frontend

```powershell
cd frontend\mule-account-detection\mule-account-detection
npm install
```

---

## Environment configuration

Nothing is hardcoded; both halves read configuration from `.env` files, and
neither `.env` is committed.

### Backend — `backend/.env`

Copy the template and fill it in:

```powershell
cd backend
Copy-Item .env.example .env
```

```ini
DATABASE_URL=mysql+pymysql://USER:PASSWORD@localhost:3306/vittapala
SQL_ECHO=false
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

`SQL_ECHO=true` logs every statement — useful when debugging, noisy otherwise.

### Frontend — `frontend/mule-account-detection/mule-account-detection/.env`

```ini
VITE_API_BASE_URL=http://127.0.0.1:8010/api
```

The trailing `/api` is required. Vite only reads `.env` at startup, so restart
the dev server after changing it.

---

## Database setup

Create the schema. The application creates the tables itself on first start.

```powershell
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS vittapala CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;"
```

`utf8mb4` matters: explanations contain the rupee sign.

---

## Seed demo data

```powershell
cd backend
.\venv\Scripts\python.exe seed_demo_data.py --reset
```

`--reset` clears transactions, risk scores and alerts first, so the demo starts
from a known state. Omit it to add data without wiping.

The dataset contains a deliberate spread so the engine can be demonstrated
immediately:

| Account | Behaviour | Expected verdict |
|---|---|---|
| Ananya Sharma (salaried) | salary in, rent and small spend out | **LOW** |
| Kiran Traders (business) | regular settlement and supplier cycle | **LOW** |
| Rohit Verma (mule) | collects from 4 sources, forwards within minutes, splits transfers | **CRITICAL** |
| Deepak Yadav | second account on the mule's handset | **MEDIUM** (device reuse) |
| Sunil Patel (dormant) | quiet for months, then a large transfer from a new city | **MEDIUM** |

---

## Running the application

### Backend

```powershell
cd backend
.\venv\Scripts\python.exe -m uvicorn app.main:app --port 8010 --reload
```

- API: <http://127.0.0.1:8010>
- Swagger UI: <http://127.0.0.1:8010/docs>
- Health: <http://127.0.0.1:8010/health>

### Frontend

```powershell
cd frontend\mule-account-detection\mule-account-detection
npm run dev
```

Open <http://localhost:5173>.

---

## API reference

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness probe |
| GET | `/` | Service metadata |
| POST | `/api/accounts/` | Create an account |
| GET | `/api/accounts/` | List / search / filter accounts |
| GET | `/api/accounts/{id}` | Account detail |
| GET | `/api/accounts/{id}/transactions` | Account transaction history |
| GET | `/api/accounts/{id}/alerts` | Alerts for an account |
| GET | `/api/accounts/{id}/investigation` | Full investigation view |
| POST | `/api/transactions/` | Record a transaction |
| GET | `/api/transactions/` | List / filter transactions |
| GET | `/api/transactions/{id}` | Transaction detail |
| POST | `/api/risk/analyze/{transaction_id}` | Score a transaction |
| GET | `/api/alerts/` | List / filter alerts |
| GET | `/api/alerts/{id}` | Alert detail |
| PATCH | `/api/alerts/{id}/status` | Move an alert through its lifecycle |
| GET | `/api/dashboard/stats` | Aggregated dashboard statistics |

### Example requests

PowerShell — note `-NoNewline` is not needed, but the console must be UTF-8 to
render `₹` correctly (see [Troubleshooting](#troubleshooting)):

```powershell
# Create an account
Invoke-RestMethod -Uri "http://127.0.0.1:8010/api/accounts/" -Method Post `
  -ContentType "application/json; charset=utf-8" `
  -Body '{"account_number":"XXXX9001","account_holder_name":"Demo User","account_type":"savings","ifsc_code":"HDFC0001234","bank_name":"HDFC Bank"}'

# Record a transaction
Invoke-RestMethod -Uri "http://127.0.0.1:8010/api/transactions/" -Method Post `
  -ContentType "application/json; charset=utf-8" `
  -Body '{"sender_account_id":5,"receiver_account_id":7,"amount":"75000.00","transaction_type":"transfer","channel":"IMPS","transaction_timestamp":"2026-08-23T12:00:00"}'

# Analyse it
Invoke-RestMethod -Uri "http://127.0.0.1:8010/api/risk/analyze/12" -Method Post

# Dashboard
Invoke-RestMethod -Uri "http://127.0.0.1:8010/api/dashboard/stats"
```

bash / curl:

```bash
curl -X POST http://127.0.0.1:8010/api/risk/analyze/12
curl "http://127.0.0.1:8010/api/alerts/?status=open&severity=critical"
curl -X PATCH http://127.0.0.1:8010/api/alerts/3/status \
  -H "Content-Type: application/json" \
  -d '{"status":"investigating","note":"assigned to team B"}'
```

---

## Risk engine

`rule_based-0.4.0`. Deterministic: the same history always produces the same
score. No machine learning, no hidden state.

### Response fields

| Field | Range | Meaning |
|---|---|---|
| `risk_score` | 0–100 | Overall risk for this transaction in context |
| `risk_level` | low / medium / high / critical | Banded form of `risk_score` |
| `mule_probability` | 0–1 | Logistic transform of the score |
| `anomaly_score` | 0–1 | How unusual the transaction itself looks |
| `detected_patterns` | list | Every rule that fired, with evidence |
| `explanation.findings` | list | The same findings in expanded form |

### Risk level mapping

| Score | Level | What it takes |
|---|---|---|
| 0 – 24.9 | **LOW** | No abnormal money movement |
| 25 – 49.9 | **MEDIUM** | One behavioural anomaly, or context signals alone |
| 50 – 74.9 | **HIGH** | A strong behavioural signal, or several independent ones |
| 75 – 100 | **CRITICAL** | Multiple independent behavioural families agree |

### The rules

Behavioural (what the money did):

`LARGE_TRANSACTION`, `VOLUME_SPIKE`, `BASELINE_SHIFT`, `STRUCTURING`,
`HIGH_VELOCITY`, `BURST_ACTIVITY`, `RAPID_MOVEMENT`, `PASS_THROUGH`,
`FAN_IN`, `FAN_OUT`, `CIRCULAR_FLOW`, `DORMANT_ACTIVATION`, `FAILED_BURST`

Context (who the account is):

`NEW_ACCOUNT`, `NEW_DEVICE`, `DEVICE_REUSE`, `NEW_LOCATION`,
`LOCATION_ANOMALY`, `NEW_RECEIVER`

### Scoring

Three layers, all visible in `explanation.score_model`:

1. **Within a family** the strongest rule counts in full, the rest at 35% —
   rules reading the same evidence must not be counted twice.
2. **Across families** scores stack with a 0.9 decay per rank, so piling on
   weak signals cannot manufacture a CRITICAL.
3. **Context only amplifies behaviour.** With no behavioural evidence, context
   is capped at 35 (MEDIUM). A new customer on a shared family phone is not a
   mule until the money does something unusual.

`explanation.family_breakdown` shows per-family totals *before* the
across-family decay and the cap — those values deliberately do not sum to
`risk_score`. The payload says so in `score_model.family_breakdown_is`.

All thresholds are named constants at the top of
`app/risk/engines/rule_based.py`.

---

## Alert behaviour

Alerts are **idempotent**. Re-analysing the same transaction updates the
existing active alert rather than inserting another row.

- An alert in `open` or `investigating` is *active* and gets reused.
- `mule_account` and `network_pattern` are account-scoped: one active alert per
  account.
- All other types are transaction-scoped: one active alert per transaction.
- Resolved alerts are never modified — they are history. A finding that recurs
  after resolution correctly opens a fresh alert.

Risk score rows are *not* deduplicated; every analysis appends one, forming an
audit trail.

Lifecycle: `open` → `investigating` → `confirmed_fraud` / `false_positive` /
`resolved`. Terminal statuses stamp `resolved_at`; reopening clears it.

---

## Testing

```powershell
cd backend
.\venv\Scripts\python.exe -m pytest tests -q
```

85 tests:

| File | Covers |
|---|---|
| `tests/test_rule_based.py` | Original behavioural rules |
| `tests/test_loophole_rules.py` | Mule-behaviour rules, evidence, determinism |
| `tests/test_adversarial.py` | 20 fraud/evasion scenarios plus false-positive guards |
| `tests/test_api.py` | Every endpoint, validation, error handling, alert idempotency, UTF-8 |

`test_api.py` needs a reachable database and skips cleanly without one.
The engine tests have no external dependencies and always run.

Frontend build check:

```powershell
cd frontend\mule-account-detection\mule-account-detection
npm run build
```

---

## Troubleshooting

**`₹` shows as `â‚¹` in PowerShell.** The API is correct — it sends UTF-8 and
declares `charset=utf-8`. Windows PowerShell 5.1 decodes to the legacy console
codepage. Fix the console:

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
```

PowerShell 7+ handles this correctly by default.

**`RuntimeError: DATABASE_URL is not set`.** Copy `.env.example` to `.env` in
`backend/` and fill in the connection string.

**`Can't connect to MySQL server`.** MySQL is not running, or the credentials
in `.env` are wrong. Verify with
`mysql -u root -p -e "SELECT 1"`.

**Frontend shows "Unable to load".** The backend is not running on the port in
`VITE_API_BASE_URL`, or the origin is missing from `CORS_ORIGINS`.

**Frontend ignores `.env`.** It must sit in the Vite project root, next to
`vite.config.js`, and Vite must be restarted.

**Port already in use.**

```powershell
netstat -ano | Select-String ":8010"
Stop-Process -Id <PID> -Force
```

---

## Security notes

- `.env` files are git-ignored; `.env.example` documents the shape.
- Secrets come from the environment only — none are hardcoded.
- All queries go through SQLAlchemy's parameter binding; no string-built SQL.
- Input is validated by Pydantic before reaching the database.
- Database errors are logged server-side and returned as a generic message;
  SQL, stack traces and paths are never exposed to clients.
- CORS is restricted to the configured origins.

There is no authentication layer — VittaPala is an internal analyst tool. Do
not expose it to the public internet without putting authentication in front
of it.
