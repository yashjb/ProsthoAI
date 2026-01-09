"""Load PDFs from the dental pdf folder, chunk, embed, and persist to SQLite.

On startup the service computes a fingerprint of the PDF folder.  If the
fingerprint matches what is already stored in the DB the expensive
embedding step is skipped entirely — making restarts instant.
"""

from __future__ import annotations

import hashlib
import os
import logging

from services.pdf_extractor import extract_text_from_pdf
from services.chunker import chunk_text
from services.embedding_store import (
    store_chunks,
    chunk_count,
    clear_store,
    set_meta,
    get_meta,
)
from config.settings import settings

logger = logging.getLogger(__name__)

_initialized = False


def _folder_fingerprint(folder: str) -> str:
    """SHA-256 over sorted (name, size, mtime) of every PDF in *folder*."""
    entries: list[str] = []
    for fname in sorted(os.listdir(folder)):
        if not fname.lower().endswith(".pdf"):
            continue
        fpath = os.path.join(folder, fname)
        stat = os.stat(fpath)
        entries.append(f"{fname}|{stat.st_size}|{int(stat.st_mtime)}")
    return hashlib.sha256("\n".join(entries).encode()).hexdigest()


def initialize_pdf_cache() -> None:
    """Load all PDFs, chunk, embed, and store — skipping if already done."""
    global _initialized

    folder = settings.dental_pdf_folder
    if not os.path.isdir(folder):
        logger.error("Dental PDF folder not found: %s", folder)
        return

    pdf_files = sorted(f for f in os.listdir(folder) if f.lower().endswith(".pdf"))
    if not pdf_files:
        logger.warning("No PDF files found in %s", folder)
        return

    fingerprint = _folder_fingerprint(folder)
    stored_fp = get_meta("folder_fingerprint")

    if stored_fp == fingerprint and chunk_count() > 0:
        logger.info(
            "PDF folder unchanged — reusing %d cached embeddings from SQLite",
            chunk_count(),
        )
        _initialized = True
        return

    # ── Need to (re-)ingest ──────────────────────────────────────────────
    logger.info("Ingesting %d PDF(s) from %s …", len(pdf_files), folder)
    clear_store()

    all_chunks: list[dict[str, str]] = []
    for filename in pdf_files:
        filepath = os.path.join(folder, filename)
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

    if all_chunks:
        logger.info("Creating embeddings for %d chunks …", len(all_chunks))
        stored = store_chunks(all_chunks)
        set_meta("folder_fingerprint", fingerprint)
        logger.info("Embedding store ready — %d chunks persisted", stored)
    else:
        logger.warning("No text extracted from any PDF")

    _initialized = True
