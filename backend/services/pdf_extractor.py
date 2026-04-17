"""Extract text from uploaded PDF files in-memory."""

from __future__ import annotations

import io
import logging

logger = logging.getLogger(__name__)


def _extract_with_pypdf2(file_bytes: bytes, filename: str) -> str:
    """Try extraction using PyPDF2."""
    from PyPDF2 import PdfReader

    reader = PdfReader(io.BytesIO(file_bytes))
    pages: list[str] = []
    for idx, page in enumerate(reader.pages):
        try:
            text = page.extract_text() or ""
            if text.strip():
                pages.append(f"[Page {idx + 1}] {text.strip()}")
        except Exception:
            logger.warning("PyPDF2: could not extract page %d from %s", idx + 1, filename)
    return "\n\n".join(pages)


def _extract_with_pymupdf(file_bytes: bytes, filename: str) -> str:
    """Try extraction using PyMuPDF (fitz) — handles more PDF formats."""
    import fitz  # PyMuPDF

    doc = fitz.open(stream=file_bytes, filetype="pdf")
    pages: list[str] = []
    for idx, page in enumerate(doc):
        try:
            text = page.get_text() or ""
            if text.strip():
                pages.append(f"[Page {idx + 1}] {text.strip()}")
        except Exception:
            logger.warning("PyMuPDF: could not extract page %d from %s", idx + 1, filename)
    doc.close()
    return "\n\n".join(pages)


def extract_text_from_pdf(file_bytes: bytes, filename: str = "unknown.pdf") -> str:
    """Return the full text extracted from a single PDF's bytes.

    Tries PyPDF2 first, falls back to PyMuPDF for PDFs with
    unsupported compression (e.g. Zstandard).
    """
    # Try PyPDF2 first
    full_text = ""
    try:
        full_text = _extract_with_pypdf2(file_bytes, filename)
    except Exception as exc:
        logger.warning("PyPDF2 failed on %s: %s — trying PyMuPDF", filename, exc)

    # Fall back to PyMuPDF if PyPDF2 returned nothing
    if not full_text.strip():
        try:
            full_text = _extract_with_pymupdf(file_bytes, filename)
            if full_text.strip():
                logger.info("PyMuPDF successfully extracted text from %s", filename)
        except Exception as exc2:
            logger.error("Both PyPDF2 and PyMuPDF failed on %s: %s", filename, exc2)
            return ""

    if full_text.strip():
        page_count = full_text.count("[Page ")
        logger.info("Extracted %d pages from %s", page_count, filename)
    else:
        logger.warning("No text could be extracted from %s", filename)
    return full_text


def extract_texts_from_pdfs(
    files: list[tuple[str, bytes]],
) -> list[dict[str, str]]:
    """Process multiple PDFs.  Returns list of {filename, text}."""
    results: list[dict[str, str]] = []
    for filename, file_bytes in files:
        text = extract_text_from_pdf(file_bytes, filename)
        results.append({"filename": filename, "text": text})
    return results
