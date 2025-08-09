"""Application settings loaded from environment variables."""

import os

from pydantic_settings import BaseSettings

_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class Settings(BaseSettings):
    """Global application settings."""

    openai_api_key: str
    openai_model: str = "gpt-4o"
    openai_max_tokens: int = 32768
    openai_temperature: float = 0.2

    # Rate limiting
    max_requests_per_minute: int = 10

    # Embedding & vision models
    embedding_model: str = "text-embedding-3-small"
    vision_model: str = "gpt-5.4"

    # PDF knowledge-base folder (pre-loaded at startup)
    dental_pdf_folder: str = os.path.join(_PROJECT_ROOT, "dental pdf")

    # Chunking
    max_chunk_tokens: int = 600
    chunk_overlap_tokens: int = 100
    max_context_chunks: int = 20

    # PDF processing
    max_pdf_size_mb: int = 20
    max_pdfs_per_request: int = 5

    # Image processing
    max_image_dimension: int = 2048
    image_quality: int = 85
    supported_image_formats: list[str] = ["jpg", "jpeg", "png", "webp"]

    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
