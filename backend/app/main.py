from fastapi import FastAPI

app = FastAPI(
    title="MuleGuard API",
    description="AI-powered Mule Account Detection System",
    version="1.0.0"
)


@app.get("/")
def root():
    return {
        "message": "MuleGuard API is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }