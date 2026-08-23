"""VittaPala API application entrypoint."""
import logging

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from .config import settings
from .database import engine
from .models import Base
from .routers import accounts, alerts, dashboard, risk, transactions

logger = logging.getLogger("vittapala")

Base.metadata.create_all(bind=engine)


class UTF8JSONResponse(JSONResponse):
    """
    JSON responses that declare their charset.

    FastAPI's default sends bare "application/json". The bytes are already
    UTF-8, but clients that default to a legacy codepage when no charset is
    declared - notably Windows PowerShell 5.1 - decode them as cp1252, which
    is what turns the rupee sign into "a-with-circumflex" mojibake.
    """

    media_type = "application/json; charset=utf-8"


app = FastAPI(
    title="VittaPala API",
    description=(
        "Fraud and mule-account detection platform: accounts, transactions, "
        "explainable rule-based risk analysis, and fraud alerts."
    ),
    version="1.1.0",
    default_response_class=UTF8JSONResponse,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(accounts.router)
app.include_router(transactions.router)
app.include_router(risk.router)
app.include_router(alerts.router)
app.include_router(dashboard.router)


@app.exception_handler(SQLAlchemyError)
async def database_error_handler(request: Request, exc: SQLAlchemyError):
    """Never leak SQL, drivers, or stack traces to API clients."""
    logger.exception("Database error on %s %s", request.method, request.url.path)

    return UTF8JSONResponse(
        status_code=500,
        content={"detail": "A database error occurred. Please try again."},
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    """Consistent, readable validation errors."""
    # Pydantic v2 error dicts can carry exception objects in "ctx", which are
    # not JSON-serialisable. jsonable_encoder makes them safe; without it the
    # handler itself fails and a validation error surfaces as a 500.
    return UTF8JSONResponse(
        status_code=422,
        content={
            "detail": "Request validation failed",
            "errors": jsonable_encoder(exc.errors()),
        },
    )


@app.get("/", tags=["Health"])
def root() -> dict:
    return {
        "message": "VittaPala API is running",
        "version": app.version,
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health_check() -> dict:
    return {"status": "healthy"}
