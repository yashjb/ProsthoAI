"""Split extracted PDF text into manageable chunks with overlap."""
# Uses tiktoken GPT-4o tokenizer for accurate sub-word counting

from __future__ import annotations

import re
import logging

import tiktoken

from config.settings import settings

logger = logging.getLogger(__name__)

_enc = tiktoken.encoding_for_model("gpt-4o")


def _count_tokens(text: str) -> int:
    """Count tokens in text using tiktoken."""
    return len(_enc.encode(text))


def chunk_text(
    text: str,
    source: str = "",
    max_tokens: int | None = None,
    overlap_tokens: int | None = None,
) -> list[dict[str, str]]:
    """Split *text* into chunks of roughly *max_tokens* tokens with overlap.

    Each chunk is a dict with ``text`` and ``source`` keys.
    The splitter first tries paragraph boundaries, then falls back to
    sentence boundaries.  After each chunk, trailing paragraphs that fit
    within *overlap_tokens* are carried over to the next chunk.
    """
    max_tokens = max_tokens or settings.max_chunk_tokens
    overlap_tokens = overlap_tokens or getattr(settings, "chunk_overlap_tokens", 0)
    if not text.strip():
        return []

    paragraphs = re.split(r"\n{2,}", text)
    chunks: list[dict[str, str]] = []
    current_paras: list[str] = []
    current_tokens = 0

    def _flush() -> list[str]:
        """Append current_paras as a chunk and return overlap paragraphs."""
        if not current_paras:
            return []
        chunks.append({"text": "\n\n".join(current_paras), "source": source})
        # Compute overlap: keep trailing paragraphs up to overlap_tokens
        if overlap_tokens <= 0:
            return []
        overlap_paras: list[str] = []
        overlap_count = 0
        for p in reversed(current_paras):
            p_tok = _count_tokens(p)
            if overlap_count + p_tok <= overlap_tokens:
                overlap_paras.insert(0, p)
                overlap_count += p_tok
            else:
                break
        return overlap_paras

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        para_tokens = _count_tokens(para)

        if current_tokens + para_tokens <= max_tokens:
            current_paras.append(para)
            current_tokens += para_tokens
        else:
            # Flush current chunk and compute overlap
            overlap = _flush()

            # If a single paragraph exceeds max_tokens, split by sentences
            if para_tokens > max_tokens:
                current_paras = list(overlap)
                current_tokens = sum(_count_tokens(p) for p in current_paras)
                sentences = re.split(r"(?<=[.!?])\s+", para)
                for sent in sentences:
                    sent_tok = _count_tokens(sent)
                    if current_tokens + sent_tok <= max_tokens:
                        current_paras.append(sent)
                        current_tokens += sent_tok
                    else:
                        if current_paras:
                            overlap = _flush()
                            current_paras = list(overlap)
                            current_tokens = sum(_count_tokens(p) for p in current_paras)
                        current_paras.append(sent)
                        current_tokens += sent_tok
            else:
                current_paras = overlap + [para]
                current_tokens = sum(_count_tokens(p) for p in current_paras)

    if current_paras:
        chunks.append({"text": "\n\n".join(current_paras), "source": source})

    logger.info("Chunked '%s' into %d chunks (max_tokens=%d)", source, len(chunks), max_tokens)
    return chunks
