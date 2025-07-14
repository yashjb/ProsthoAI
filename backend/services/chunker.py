"""Split extracted PDF text into manageable chunks."""

from __future__ import annotations

import re
import logging

import tiktoken

from config.settings import settings

logger = logging.getLogger(__name__)

_enc = tiktoken.encoding_for_model("gpt-4o")


def _count_tokens(text: str) -> int:
    return len(_enc.encode(text))


def chunk_text(
    text: str,
    source: str = "",
    max_tokens: int | None = None,
) -> list[dict[str, str]]:
    """Split *text* into chunks of roughly *max_tokens* tokens.

    Each chunk is a dict with ``text`` and ``source`` keys.
    The splitter first tries paragraph boundaries, then falls back to
    sentence boundaries.
    """
    max_tokens = max_tokens or settings.max_chunk_tokens
    if not text.strip():
        return []

    paragraphs = re.split(r"\n{2,}", text)
    chunks: list[dict[str, str]] = []
    current = ""

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        candidate = f"{current}\n\n{para}".strip() if current else para
        if _count_tokens(candidate) <= max_tokens:
            current = candidate
        else:
            if current:
                chunks.append({"text": current, "source": source})
            # If a single paragraph exceeds max_tokens, split by sentences
            if _count_tokens(para) > max_tokens:
                sentences = re.split(r"(?<=[.!?])\s+", para)
                current = ""
                for sent in sentences:
                    cand = f"{current} {sent}".strip() if current else sent
                    if _count_tokens(cand) <= max_tokens:
                        current = cand
                    else:
                        if current:
                            chunks.append({"text": current, "source": source})
                        current = sent
            else:
                current = para

    if current:
        chunks.append({"text": current, "source": source})

    logger.info("Chunked '%s' into %d chunks", source, len(chunks))
    return chunks
