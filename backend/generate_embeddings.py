"""Generate embeddings for pre-chunked text (Step 4, requires OpenAI API key).

Usage:
    cd backend
    env\\Scripts\\activate
    python generate_embeddings.py

Prerequisites:
    Run `python generate_parquet.py` first to create chunks_text.parquet (Steps 1-3).

This script:
    Reads chunks_text.parquet → calls OpenAI embeddings API → saves chunks.parquet

After this, the server can start and use the pre-computed embeddings directly.
"""

from __future__ import annotations

import logging
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config.settings import settings
from services.embedding_store import embed_stored_chunks

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


def main() -> None:
    text_path = os.path.join(settings.parquet_folder, "chunks_text.parquet")
    if not os.path.exists(text_path):
        logger.error(
            "Text chunks not found at %s — run 'python generate_parquet.py' first",
            text_path,
        )
        sys.exit(1)

    start = time.time()
    count = embed_stored_chunks()
    elapsed = time.time() - start

    if count > 0:
        logger.info("Done! %d chunks embedded in %.1fs", count, elapsed)
        logger.info("Server is now ready: uvicorn main:app --reload --port 8000")
    else:
        logger.error("No chunks were embedded — check errors above")
        sys.exit(1)


if __name__ == "__main__":
    main()
