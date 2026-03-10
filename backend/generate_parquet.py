"""Generate text-chunk parquet files from dental PDFs (Steps 1-3, NO OpenAI needed).

Usage:
    cd backend
    env\\Scripts\\activate
    python generate_parquet.py

This script:
1. Reads all PDFs from the dental_pdf folder
2. Extracts text from each PDF
3. Chunks the text into smaller passages
4. Saves text chunks to parquet_files/chunks_text.parquet

After this, run `python generate_embeddings.py` to add OpenAI embeddings (Step 4).
"""

from __future__ import annotations

import hashlib
import logging
import os
import shutil
import sys
import time

# Ensure the backend package is importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config.settings import settings
from services.pdf_extractor import extract_text_from_pdf
from services.chunker import chunk_text
from services.embedding_store import store_text_chunks, set_meta

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


def _folder_fingerprint(folder: str) -> str:
    """SHA-256 over sorted (name, size) of every PDF in *folder*."""
    entries: list[str] = []
    for fname in sorted(os.listdir(folder)):
        if not fname.lower().endswith(".pdf"):
            continue
        fpath = os.path.join(folder, fname)
        stat = os.stat(fpath)
        entries.append(f"{fname}|{stat.st_size}")
    return hashlib.sha256("\n".join(entries).encode()).hexdigest()


def main() -> None:
    pdf_folder = settings.dental_pdf_folder
    parquet_dir = settings.parquet_folder

    if not os.path.isdir(pdf_folder):
        logger.error("Dental PDF folder not found: %s", pdf_folder)
        sys.exit(1)

    pdf_files = sorted(f for f in os.listdir(pdf_folder) if f.lower().endswith(".pdf"))
    if not pdf_files:
        logger.error("No PDF files found in %s", pdf_folder)
        sys.exit(1)

    # ── Clean previous parquet files ─────────────────────────────────────
    if os.path.isdir(parquet_dir):
        logger.info("Removing old parquet files from %s …", parquet_dir)
        shutil.rmtree(parquet_dir)
    os.makedirs(parquet_dir, exist_ok=True)

    # ── Extract & chunk ──────────────────────────────────────────────────
    logger.info("Processing %d PDF(s) from %s …", len(pdf_files), pdf_folder)
    start = time.time()

    all_chunks: list[dict[str, str]] = []
    for filename in pdf_files:
        filepath = os.path.join(pdf_folder, filename)
        try:
            with open(filepath, "rb") as fh:
                file_bytes = fh.read()
            text = extract_text_from_pdf(file_bytes, filename)
            if text.strip():
                chunks = chunk_text(text, source=filename)
                all_chunks.extend(chunks)
                logger.info("  ✓ %s — %d chunks", filename, len(chunks))
            else:
                logger.warning("  ⚠ %s — no text extracted", filename)
        except Exception as exc:
            logger.error("  ✗ Failed to process %s: %s", filename, exc)

    if not all_chunks:
        logger.error("No text extracted from any PDF — aborting")
        sys.exit(1)

    # ── Save text chunks to parquet (NO OpenAI needed) ───────────────────
    stored = store_text_chunks(all_chunks)

    fingerprint = _folder_fingerprint(pdf_folder)
    set_meta("folder_fingerprint", fingerprint)

    elapsed = time.time() - start
    logger.info(
        "Done! %d text chunks saved to %s (%.1fs)",
        stored,
        parquet_dir,
        elapsed,
    )
    logger.info("Next step: run 'python generate_embeddings.py' to create embeddings (requires OpenAI API key)")


if __name__ == "__main__":
    main()
