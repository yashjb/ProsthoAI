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
    openai_timeout: int = 120

    # Vision model timeout (longer for image processing)
    vision_timeout: int = 180

    # Rate limiting
    max_requests_per_minute: int = 15

    # Embedding & vision models
    embedding_model: str = "text-embedding-3-small"
    vision_model: str = "gpt-5.4"
    embedding_dimensions: int = 1536
    embedding_batch_size: int = 100

    # Logging
    log_level: str = "INFO"
    log_format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    # PDF knowledge-base folder (pre-loaded at startup)
    dental_pdf_folder: str = os.path.join(_PROJECT_ROOT, "dental pdf")

    # Chunking
    max_chunk_tokens: int = 600
    chunk_overlap_tokens: int = 100
    max_context_chunks: int = 20
    min_chunk_tokens: int = 50

    # Retrieval
    retrieval_top_k: int = 20

    # PDF processing
    max_pdf_size_mb: int = 20
    max_pdfs_per_request: int = 5
    allowed_pdf_extensions: list[str] = ["pdf"]
    pdf_extraction_timeout: int = 30

    # Image processing
    max_image_dimension: int = 2048
    image_quality: int = 85
    supported_image_formats: list[str] = ["jpg", "jpeg", "png", "webp"]
    max_images_per_request: int = 10

    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # CORS configuration
    cors_allow_credentials: bool = True
    cors_allow_methods: list[str] = ["*"]
    cors_allow_headers: list[str] = ["*"]

    # Security
    api_key_header: str = "X-API-Key"
    enable_api_key_auth: bool = False
    max_request_size_mb: int = 100

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
