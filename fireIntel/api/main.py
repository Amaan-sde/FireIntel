"""
FIREINTEL REST API Engine
High-performance FastAPI backend querying Parquet datasets via DuckDB.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fireIntel.api.routes import mission_control, fires, terrain, benchmarks, data_explorer

app = FastAPI(
    title="FIREINTEL Mission Control API",
    description="Scientific Forest Fire Intelligence System for Uttarakhand, India (NASA Space Apps Challenge 2026)",
    version="1.0.0"
)

# Configure CORS for Next.js web frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(mission_control.router, prefix="/api")
app.include_router(fires.router, prefix="/api")
app.include_router(terrain.router, prefix="/api")
app.include_router(benchmarks.router, prefix="/api")

# Mount Data Explorer on both /api/v1 and /api for backward and modern compatibility
app.include_router(data_explorer.router, prefix="/api/v1")
app.include_router(data_explorer.router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "FIREINTEL Mission Control API",
        "version": "1.0.0",
        "study_area": "Uttarakhand, India",
        "study_period": "2025-01-01 to 2025-12-31"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("fireIntel.api.main:app", host="0.0.0.0", port=8000, reload=True)

