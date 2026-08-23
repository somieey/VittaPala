"""Database engine and session management."""
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from .config import settings
from .models import Base

DATABASE_URL = settings.require_database_url()

# charset is stated explicitly rather than relying on server defaults, so the
# connection is UTF-8 regardless of how the MySQL server is configured.
_connect_args = {"charset": "utf8mb4"} if DATABASE_URL.startswith("mysql") else {}

engine = create_engine(
    DATABASE_URL,
    echo=settings.sql_echo,
    pool_pre_ping=True,
    pool_recycle=3600,
    connect_args=_connect_args,
    future=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db():
    """FastAPI dependency yielding a session that is always closed."""
    db: Session = SessionLocal()

    try:
        yield db
    finally:
        db.close()


__all__ = ["Base", "engine", "SessionLocal", "get_db", "DATABASE_URL"]
