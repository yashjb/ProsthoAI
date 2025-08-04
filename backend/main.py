"""FastAPI application entry-point."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config.settings import settings
from api.routes import router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup: pre-load and chunk all dental PDFs ──────────────────────
    from services.pdf_cache import initialize_pdf_cache

    initialize_pdf_cache()
    yield
    # ── Shutdown ─────────────────────────────────────────────────────────


app = FastAPI(
    title="ProsthoAI — Treatment Planning Assistant",
    version="1.0.0",
    description="AI-powered prosthodontic clinical decision-support tool.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")


@app.get("/health")
async def health():
    """Health check endpoint with basic system info."""
    return {
        "status": "ok",
        "version": "1.0.0",
        "model": settings.openai_model
    }
