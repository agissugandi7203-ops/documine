from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.supabase_client import supabase_db
from app.ai.gateway import ai_gateway
from app.routers import documents, chat, analytics, synthesis, audio, auth, search, relationships

app = FastAPI(
    title=settings.app_name,
    version="2.0.0",
    description="Backend API for DocuMind: Three-Pillar AI Document Intelligence Workspace",
)

# Configure Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(relationships.router, prefix="/api")
app.include_router(synthesis.router, prefix="/api")
app.include_router(audio.router, prefix="/api")


@app.get("/")
async def root():
    return {
        "app": settings.app_name,
        "version": "2.0.0",
        "status": "online",
        "ai_provider": settings.ai_default_provider,
        "models": {
            "embedding": f"{settings.openai_embedding_model} ({settings.openai_embedding_dimensions}d)",
            "fast": settings.openai_model_fast,
            "balanced": settings.openai_model_balanced,
            "deep": settings.openai_model_deep,
        },
        "docs_url": "/docs",
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "supabase_connected": supabase_db.is_connected,
        "openai_configured": ai_gateway.is_openai_configured,
        "ai_default_provider": settings.ai_default_provider,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=True)
