"""Lightweight in-memory retriever — ranks chunks by keyword relevance."""

from __future__ import annotations

import re
import logging
from collections import Counter

from config.settings import settings

logger = logging.getLogger(__name__)

_STOP_WORDS = frozenset({
    "the", "a", "an", "in", "on", "of", "and", "or", "is", "are",
    "to", "for", "with", "this", "that", "it", "at", "by", "as",
})


def _tokenize(text: str) -> list[str]:
    """Lowercase word tokenizer for keyword matching."""
    return re.findall(r"[a-z0-9]+", text.lower())


def _score_chunk(chunk_tokens: list[str], query_tokens_counter: Counter) -> float:
    """Compute a simple TF-overlap score between chunk and query."""
    chunk_counter = Counter(chunk_tokens)
    score = 0.0
    for token, q_freq in query_tokens_counter.items():
        if token in chunk_counter:
            score += chunk_counter[token] * q_freq
    # Normalize by chunk length to avoid bias toward longer chunks
    if chunk_tokens:
        score /= len(chunk_tokens) ** 0.5
    return score


def retrieve_relevant_chunks(
    chunks: list[dict[str, str]],
    query: str,
    top_k: int | None = None,
) -> list[dict[str, str]]:
    """Return the *top_k* most relevant chunks for *query*.

    Uses keyword overlap scoring — no embeddings needed since the PDFs
    are processed transiently per request.
    """
    top_k = top_k or settings.max_context_chunks
    if not chunks:
        return []

    query_tokens = _tokenize(query)
    if not query_tokens:
        return chunks[:top_k]

    query_counter = Counter(query_tokens)

    scored: list[tuple[float, dict[str, str]]] = []
    for chunk in chunks:
        tokens = _tokenize(chunk["text"])
        score = _score_chunk(tokens, query_counter)
        scored.append((score, chunk))

    _n_pos = sum(1 for s, _ in scored if s > 0)
    logger.debug("Pre-sort: %d non-zero / %d total scored chunks", _n_pos, len(scored))
    scored.sort(key=lambda x: x[0], reverse=True)

    # Filter out zero-score chunks if we have enough non-zero ones
    non_zero = [(s, c) for s, c in scored if s > 0]
    if len(non_zero) >= top_k:
        result = [c for _, c in non_zero[:top_k]]
    else:
        result = [c for _, c in scored[:top_k]]

    logger.info(
        "Retrieved %d relevant chunks (from %d total, top_k=%d)",
        len(result),
        len(chunks),
        top_k,
    )
    return result
