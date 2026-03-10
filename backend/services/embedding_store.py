"""Parquet-backed persistent vector store for PDF chunk embeddings.

Stores chunk text, source filename, and embedding vectors in local
Parquet files.  At query time, performs cosine-similarity search
entirely in Python (no external vector DB required).
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

import numpy as np
import pyarrow as pa
import pyarrow.parquet as pq

from config.settings import settings
# All Parquet I/O is synchronous — async wrappers added at route layer

logger = logging.getLogger(__name__)
# Cosine similarity search is O(n) over all chunks — fine for <50k


def _get_parquet_dir() -> str:
    return settings.parquet_folder


def _chunks_path() -> str:
    return os.path.join(_get_parquet_dir(), "chunks.parquet")


def _chunks_text_path() -> str:
    """Path to the text-only chunk Parquet (no embeddings)."""
    return os.path.join(_get_parquet_dir(), "chunks_text.parquet")


def _meta_path() -> str:
    """Path to the Parquet metadata file (ingestion fingerprints)."""
    return os.path.join(_get_parquet_dir(), "meta.parquet")


# ── OpenAI Embedding helper (lazy import — not needed for text-only operations) ──

_client = None


def _get_client():
    global _client
    if _client is None:
        from openai import OpenAI
        _client = OpenAI(api_key=settings.openai_api_key)
    return _client


def _get_embedding(text: str) -> list[float]:
    """Call the OpenAI embedding API for a single text."""
    resp = _get_client().embeddings.create(
        model=settings.embedding_model,
        input=text,
    )
    return resp.data[0].embedding


def _get_embeddings_batch(texts: list[str], batch_size: int = 50) -> list[list[float]]:
    """Embed *texts* in batches to stay within API limits."""
    import time
    client = _get_client()
    all_embeddings: list[list[float]] = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i: i + batch_size]
        for attempt in range(5):
            try:
                resp = client.embeddings.create(
                    model=settings.embedding_model,
                    input=batch,
                )
                # OpenAI may return out of order when using batch — sort by index
                sorted_data = sorted(resp.data, key=lambda d: d.index)
                all_embeddings.extend([d.embedding for d in sorted_data])
                logger.info(
                    "  Embedded batch %d–%d / %d",
                    i + 1,
                    min(i + batch_size, len(texts)),
                    len(texts),
                )
                break
            except Exception as exc:
                if "429" in str(exc) and attempt < 4:
                    wait = 2 ** (attempt + 1)
                    logger.warning("Rate limited — retrying in %ds …", wait)
                    time.sleep(wait)
                else:
                    raise
        # Small delay between batches to avoid rate limits
        time.sleep(0.5)
    return all_embeddings


# ── In-memory cache for fast retrieval ───────────────────────────────────────

_cache: dict[str, Any] | None = None


def _load_cache() -> dict[str, Any]:
    """Load chunks parquet into memory once for fast retrieval."""
    global _cache
    if _cache is not None:
        return _cache

    path = _chunks_path()
    if not os.path.exists(path):
        _cache = {"sources": [], "contents": [], "embeddings": np.empty((0, 0))}
        return _cache

    table = pq.read_table(path)
    sources = table.column("source").to_pylist()
    contents = table.column("content").to_pylist()
    emb_json_list = table.column("embedding").to_pylist()
    embeddings = np.array([json.loads(e) for e in emb_json_list], dtype=np.float32)

    _cache = {"sources": sources, "contents": contents, "embeddings": embeddings}
    logger.info("Loaded %d chunks from parquet into memory", len(sources))
    return _cache


def _invalidate_cache() -> None:
    global _cache
    _cache = None


# ── Store ────────────────────────────────────────────────────────────────────

def store_text_chunks(chunks: list[dict[str, str]]) -> int:
    """Save text chunks [{text, source}] to parquet WITHOUT embeddings.

    This is step 1-3 (local, free, no OpenAI needed).
    Returns the number of chunks stored.
    """
    if not chunks:
        return 0

    parquet_dir = _get_parquet_dir()
    os.makedirs(parquet_dir, exist_ok=True)

    table = pa.table({
        "source": [c["source"] for c in chunks],
        "content": [c["text"] for c in chunks],
    })

    pq.write_table(table, _chunks_text_path())
    logger.info("Saved %d text chunks to %s", len(chunks), _chunks_text_path())
    return len(chunks)


def embed_stored_chunks() -> int:
    """Read text-only parquet, generate embeddings, save final parquet.

    This is step 4 (requires OpenAI API key with credits).
    Returns the number of chunks embedded.
    """
    text_path = _chunks_text_path()
    if not os.path.exists(text_path):
        logger.error("No text chunks found at %s — run generate_parquet.py first", text_path)
        return 0

    table = pq.read_table(text_path)
    sources = table.column("source").to_pylist()
    contents = table.column("content").to_pylist()

    if not contents:
        logger.warning("Text chunks parquet is empty")
        return 0

    logger.info("Generating embeddings for %d chunks …", len(contents))
    embeddings = _get_embeddings_batch(contents)

    parquet_dir = _get_parquet_dir()
    os.makedirs(parquet_dir, exist_ok=True)

    final_table = pa.table({
        "source": sources,
        "content": contents,
        "embedding": [json.dumps(emb) for emb in embeddings],
    })

    pq.write_table(final_table, _chunks_path())
    _invalidate_cache()

    logger.info("Stored %d embedded chunks in %s", len(contents), _chunks_path())
    return len(contents)


def store_chunks(chunks: list[dict[str, str]]) -> int:
    """Embed and persist *chunks* [{text, source}] into Parquet files.

    Returns the number of chunks stored.
    """
    if not chunks:
        return 0

    texts = [c["text"] for c in chunks]
    embeddings = _get_embeddings_batch(texts)

    parquet_dir = _get_parquet_dir()
    os.makedirs(parquet_dir, exist_ok=True)

    table = pa.table({
        "source": [c["source"] for c in chunks],
        "content": texts,
        "embedding": [json.dumps(emb) for emb in embeddings],
    })

    pq.write_table(table, _chunks_path())
    _invalidate_cache()

    logger.info("Stored %d chunks in %s", len(chunks), _chunks_path())
    return len(chunks)


def chunk_count() -> int:
    """Return the number of chunks currently stored."""
    path = _chunks_path()
    if not os.path.exists(path):
        return 0
    meta = pq.read_metadata(path)
    return meta.num_rows


def clear_store() -> None:
    """Remove all stored chunks (useful for re-ingestion)."""
    path = _chunks_path()
    if os.path.exists(path):
        os.remove(path)
    _invalidate_cache()
    logger.info("Cleared embedding store")


def set_meta(key: str, value: str) -> None:
    parquet_dir = _get_parquet_dir()
    os.makedirs(parquet_dir, exist_ok=True)

    meta_path = _meta_path()

    # Load existing meta if present
    existing: dict[str, str] = {}
    if os.path.exists(meta_path):
        t = pq.read_table(meta_path)
        keys = t.column("key").to_pylist()
        values = t.column("value").to_pylist()
        existing = dict(zip(keys, values))

    existing[key] = value

    table = pa.table({
        "key": list(existing.keys()),
        "value": list(existing.values()),
    })
    pq.write_table(table, meta_path)


def get_meta(key: str) -> str | None:
    meta_path = _meta_path()
    if not os.path.exists(meta_path):
        return None
    t = pq.read_table(meta_path)
    keys = t.column("key").to_pylist()
    values = t.column("value").to_pylist()
    meta = dict(zip(keys, values))
    return meta.get(key)


# ── Retrieval ────────────────────────────────────────────────────────────────

def retrieve(
    query: str,
    top_k: int | None = None,
) -> list[dict[str, str]]:
    """Return the *top_k* most semantically similar chunks for *query*.

    Performs a full scan + cosine similarity using cached numpy arrays.
    """
    top_k = top_k or settings.max_context_chunks

    cache = _load_cache()
    if len(cache["sources"]) == 0:
        logger.warning("No chunks loaded — parquet may be missing")
        return []

    query_emb = np.array(_get_embedding(query), dtype=np.float32)
    embeddings = cache["embeddings"]

    # Vectorized cosine similarity
    norms = np.linalg.norm(embeddings, axis=1) * np.linalg.norm(query_emb)
    norms[norms == 0] = 1.0
    scores = embeddings @ query_emb / norms

    top_indices = np.argsort(scores)[::-1][:top_k]

    result = [
        {"text": cache["contents"][i], "source": cache["sources"][i]}
        for i in top_indices
    ]

    logger.info(
        "Retrieved %d chunks (top score=%.4f, %d total)",
        len(result),
        scores[top_indices[0]] if len(top_indices) > 0 else 0.0,
        len(cache["sources"]),
    )
    return result
