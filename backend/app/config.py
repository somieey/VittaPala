"""Application configuration, read once from the environment."""
import os

from dotenv import load_dotenv

load_dotenv()


def _bool(name: str, default: str = "false") -> bool:
    return os.getenv(name, default).strip().lower() in ("1", "true", "yes", "on")


class Settings:
    """Runtime configuration. No secrets are hardcoded here."""

    def __init__(self) -> None:
        self.database_url: str = os.getenv("DATABASE_URL", "")

        # SQL echo is a debugging aid, not a default. It also floods the
        # console with statements containing non-ASCII explanation text.
        self.sql_echo: bool = _bool("SQL_ECHO")

        self.cors_origins: list[str] = [
            origin.strip()
            for origin in os.getenv(
                "CORS_ORIGINS",
                "http://localhost:5173,http://127.0.0.1:5173",
            ).split(",")
            if origin.strip()
        ]

    def require_database_url(self) -> str:
        if not self.database_url:
            raise RuntimeError(
                "DATABASE_URL is not set. Copy .env.example to .env and fill "
                "in your database connection string."
            )
        return self.database_url


settings = Settings()
