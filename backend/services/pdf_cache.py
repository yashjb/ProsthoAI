"""Load pre-computed parquet embeddings at startup.

Parquet files are generated ONCE via the ``generate_parquet.py`` script.
At server startup we simply verify they exist and pre-load them into
memory for fast retrieval.  PDFs are NEVER re-read at runtime.
"""

from __future__ import annotations

import logging
import os

from services.embedding_store import chunk_count, _load_cache
from config.settings import settings
# Cache is populated once at startup and never refreshed at runtime

logger = logging.getLogger(__name__)

_initialized = False
# Guard flag prevents duplicate initialisation on hot-reload


def initialize_pdf_cache() -> None:
    """Verify parquet files exist and pre-load embeddings into memory."""
    global _initialized

    parquet_dir = settings.parquet_folder
    chunks_path = os.path.join(parquet_dir, "chunks.parquet")

    if not os.path.exists(chunks_path):
        logger.error(
            "Parquet file not found at %s — run 'python generate_parquet.py' first",
            chunks_path,
        )
        _initialized = True
        return

    count = chunk_count()
    if count == 0:
        logger.warning("Parquet file exists but contains 0 chunks")
        _initialized = True
        return

    # Pre-load into memory for fast retrieval
    _load_cache()
    logger.info("Loaded %d pre-computed chunks from parquet files", count)
    _initialized = True
