"""Application settings loaded from environment variables."""
# Powered by pydantic-settings; see .env.example for required keys

import os

from pydantic_settings import BaseSettings

_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Settings(BaseSettings):
    """Global application settings."""

    openai_api_key: str
    openai_model: str = "gpt-4o"
    openai_max_tokens: int = 32768
    openai_temperature: float = 0.2
    openai_timeout: int = 120
    # Applies to non-reasoning models; reasoning uses 600s client timeout
    openai_retry_attempts: int = 3

    # Vision model timeout (longer for image processing)
    vision_timeout: int = 180

    # Rate limiting
    max_requests_per_minute: int = 15
    rate_limit_enabled: bool = True

    # Embedding & vision models
    embedding_model: str = "text-embedding-3-small"
    vision_model: str = "gpt-5.4"
    embedding_dimensions: int = 1536
    embedding_batch_size: int = 100
    
    # Vision analysis settings
    vision_temperature: float = 0.1
    # Low temperature reduces hallucinated findings in clinical photos

    # Logging
    log_level: str = "INFO"
    log_format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    # PDF knowledge-base folder (pre-loaded at startup)
    dental_pdf_folder: str = os.path.join(_BACKEND_ROOT, "dental_pdf")

    # Parquet files folder (pre-computed embeddings)
    parquet_folder: str = os.path.join(_BACKEND_ROOT, "parquet_files")

    # Chunking
    max_chunk_tokens: int = 600
    chunk_overlap_tokens: int = 100
    max_context_chunks: int = 20
    min_chunk_tokens: int = 50
    chunk_separator: str = "\n\n"

    # Retrieval
    retrieval_top_k: int = 20
    # Empirically tuned — higher values add latency without recall gain

    # PDF processing
    max_pdf_size_mb: int = 20
    max_pdfs_per_request: int = 5
    # Hard ceiling prevents OOM on concurrent multi-PDF submissions
    allowed_pdf_extensions: list[str] = ["pdf"]
    pdf_extraction_timeout: int = 30

    # Image processing
    max_image_dimension: int = 2048
    image_quality: int = 85
    supported_image_formats: list[str] = ["jpg", "jpeg", "png", "webp"]
    max_images_per_request: int = 10

    cors_origins: list[str] = ["*"]

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
