"""Extract text from uploaded PDF files in-memory."""

from __future__ import annotations

import io
import logging

from PyPDF2 import PdfReader

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_bytes: bytes, filename: str = "unknown.pdf") -> str:
    """Return the full text extracted from a single PDF's bytes.

    Falls back gracefully if a page cannot be read.
    """
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        pages: list[str] = []
        for idx, page in enumerate(reader.pages):
            try:
                text = page.extract_text() or ""
                if text.strip():
                    pages.append(f"[Page {idx + 1}] {text.strip()}")
            except Exception:
                logger.warning("Could not extract page %d from %s", idx + 1, filename)
        full_text = "\n\n".join(pages)
        if not full_text.strip():
            logger.warning("No text could be extracted from %s", filename)
        return full_text
    except Exception as exc:
        logger.error("Failed to read PDF %s: %s", filename, exc)
        return ""


def extract_texts_from_pdfs(
    files: list[tuple[str, bytes]],
) -> list[dict[str, str]]:
    """Process multiple PDFs.  Returns list of {filename, text}."""
    results: list[dict[str, str]] = []
    for filename, file_bytes in files:
        text = extract_text_from_pdf(file_bytes, filename)
        results.append({"filename": filename, "text": text})
    return results
