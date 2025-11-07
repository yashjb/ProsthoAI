"""FastAPI application entry-point."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import settings
from api.routes import router

logger = logging.getLogger(__name__)
__version__ = "0.2.0"

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown tasks."""
    # ── Startup: pre-load and chunk all dental PDFs ──────────────────────
    from services.pdf_cache import initialize_pdf_cache

    logger.info("ProsthoAI %s starting up", __version__)
    initialize_pdf_cache()
    yield
    # ── Shutdown ─────────────────────────────────────────────────────────


app = FastAPI(
    title="ProsthoAI — Treatment Planning Assistant",
    version="1.0.0",
    description="AI-powered prosthodontic clinical decision-support tool - semantic PDF retrieval and multimodal vision analysis.",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=86400,  # 24 h - reduces preflight OPTIONS round-trips
)

app.include_router(router, prefix="/api")


@app.get("/health")
async def health():
    """Health check endpoint with basic system info."""
    import sys
    return {
        "status": "ok",
        "version": "1.0.0",
        "model": settings.openai_model,
        "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    }
