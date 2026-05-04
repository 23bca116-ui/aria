from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from api.auth import router as auth_router
from api.user import router as user_router
from api.memory import router as memory_router
from api.voice import router as voice_router
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for ARIA Voice Companion"
)

# Set up CORS — expose custom headers so frontend JS can read them
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://incomparable-kataifi-e53f2a.netlify.app",
        "*" # Fallback
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Aria-Transcription", "X-Aria-Response-Text"],
)

# Include Routers
app.include_router(auth_router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(user_router, prefix=f"{settings.API_V1_STR}/user", tags=["user"])
app.include_router(memory_router, prefix=f"{settings.API_V1_STR}/memory", tags=["memory"])
app.include_router(voice_router, prefix=f"{settings.API_V1_STR}/voice", tags=["voice"])

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": settings.PROJECT_NAME}

# --- Serve Frontend Directly (unified server) ---
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Static asset folders
for folder in ["css", "js", "assets"]:
    folder_path = os.path.join(base_dir, folder)
    if os.path.isdir(folder_path):
        app.mount(f"/{folder}", StaticFiles(directory=folder_path), name=folder)

@app.get("/")
@app.get("/index.html")
async def serve_index():
    return FileResponse(os.path.join(base_dir, "index.html"))

@app.get("/service-worker.js")
async def serve_sw():
    sw_path = os.path.join(base_dir, "service-worker.js")
    if os.path.exists(sw_path):
        return FileResponse(sw_path)
    return {"detail": "not found"}

@app.get("/manifest.json")
async def serve_manifest():
    m_path = os.path.join(base_dir, "manifest.json")
    if os.path.exists(m_path):
        return FileResponse(m_path)
    return {"detail": "not found"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
