"""Application settings loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Global application settings."""

    openai_api_key: str
    openai_model: str = "gpt-4o"
    openai_max_tokens: int = 8192
    openai_temperature: float = 0.2

    max_pdf_size_mb: int = 20
    max_pdfs_per_request: int = 5
    max_chunk_tokens: int = 600
    max_context_chunks: int = 15

    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
