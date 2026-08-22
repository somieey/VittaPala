from fastapi import FastAPI

from .database import engine
from .models import Base
from .routers import accounts, transactions
from .routers import risk


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="VittaPala API",
    description="Backend API for the VittaPala project",
    version="1.0.0",
)

app.include_router(accounts.router)
app.include_router(transactions.router)
app.include_router(risk.router)


@app.get("/")
def root():
    return {
        "message": "VittaPala API is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }