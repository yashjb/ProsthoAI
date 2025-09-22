"""SQLite-backed persistent vector store for PDF chunk embeddings.

Stores chunk text, source filename, and embedding vectors in a local
SQLite database.  At query time, performs cosine-similarity search
entirely in Python (no external vector DB required).
"""

from __future__ import annotations

import json
import logging
import os
import sqlite3
from typing import Any

import numpy as np
from openai import OpenAI

from config.settings import settings

logger = logging.getLogger(__name__)

_DB_PATH: str | None = None


def _get_db_path() -> str:
    global _DB_PATH
    if _DB_PATH is None:
        _DB_PATH = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "dental_knowledge.db",
        )
    return _DB_PATH


# ── Schema ───────────────────────────────────────────────────────────────────

def _init_db(conn: sqlite3.Connection) -> None:
    conn.execute("""
        CREATE TABLE IF NOT EXISTS chunks (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            source     TEXT    NOT NULL,
            content    TEXT    NOT NULL,
            embedding  TEXT    NOT NULL
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS meta (
            key   TEXT PRIMARY KEY,
            value TEXT
        )
    """)
    conn.commit()


# ── OpenAI Embedding helper ─────────────────────────────────────────────────

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.openai_api_key)
    return _client


def _get_embedding(text: str) -> list[float]:
    """Call the OpenAI embedding API for a single text."""
    resp = _get_client().embeddings.create(
        model=settings.embedding_model,
        input=text,
    )
    return resp.data[0].embedding


def _get_embeddings_batch(texts: list[str], batch_size: int = 100) -> list[list[float]]:
    """Embed *texts* in batches to stay within API limits."""
    client = _get_client()
    all_embeddings: list[list[float]] = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i: i + batch_size]
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
    return all_embeddings


# ── Store ────────────────────────────────────────────────────────────────────

def store_chunks(chunks: list[dict[str, str]]) -> int:
    """Embed and persist *chunks* [{text, source}] into the SQLite DB.

    Returns the number of chunks stored.
    """
    if not chunks:
        return 0

    texts = [c["text"] for c in chunks]
    embeddings = _get_embeddings_batch(texts)

    db_path = _get_db_path()
    conn = sqlite3.connect(db_path)
    _init_db(conn)

    rows = [
        (c["source"], c["text"], json.dumps(emb))
        for c, emb in zip(chunks, embeddings)
    ]
    conn.executemany(
        "INSERT INTO chunks (source, content, embedding) VALUES (?, ?, ?)",
        rows,
    )
    conn.commit()
    conn.close()

    logger.info("Stored %d chunks in %s", len(rows), db_path)
    return len(rows)


def chunk_count() -> int:
    """Return the number of chunks currently in the DB."""
    db_path = _get_db_path()
    if not os.path.exists(db_path):
        return 0
    conn = sqlite3.connect(db_path)
    _init_db(conn)
    (n,) = conn.execute("SELECT COUNT(*) FROM chunks").fetchone()
    conn.close()
    return n


def clear_store() -> None:
    """Drop all stored chunks (useful for re-ingestion)."""
    db_path = _get_db_path()
    if not os.path.exists(db_path):
        return
    conn = sqlite3.connect(db_path)
    conn.execute("DELETE FROM chunks")
    conn.commit()
    conn.close()
    logger.info("Cleared embedding store at %s", db_path)


def set_meta(key: str, value: str) -> None:
    db_path = _get_db_path()
    conn = sqlite3.connect(db_path)
    _init_db(conn)
    conn.execute(
        "INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)",
        (key, value),
    )
    conn.commit()
    conn.close()


def get_meta(key: str) -> str | None:
    db_path = _get_db_path()
    if not os.path.exists(db_path):
        return None
    conn = sqlite3.connect(db_path)
    _init_db(conn)
    row = conn.execute("SELECT value FROM meta WHERE key = ?", (key,)).fetchone()
    conn.close()
    return row[0] if row else None


# ── Retrieval ────────────────────────────────────────────────────────────────

def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)


def retrieve(
    query: str,
    top_k: int | None = None,
) -> list[dict[str, str]]:
    """Return the *top_k* most semantically similar chunks for *query*.

    Performs a full scan + cosine similarity.  Fine for thousands of
    chunks; for millions you'd want an ANN index.
    """
    top_k = top_k or settings.max_context_chunks

    db_path = _get_db_path()
    if not os.path.exists(db_path):
        logger.warning("Embedding DB not found at %s", db_path)
        return []

    query_emb = np.array(_get_embedding(query))

    conn = sqlite3.connect(db_path)
    _init_db(conn)
    rows = conn.execute("SELECT source, content, embedding FROM chunks").fetchall()
    conn.close()

    if not rows:
        return []

    scored: list[tuple[float, dict[str, str]]] = []
    for source, content, emb_json in rows:
        emb = np.array(json.loads(emb_json))
        score = _cosine_similarity(query_emb, emb)
        scored.append((score, {"text": content, "source": source}))

    scored.sort(key=lambda x: x[0], reverse=True)
    result = [c for _, c in scored[:top_k]]

    logger.info(
        "Retrieved %d chunks (top score=%.4f, %d total in DB)",
        len(result),
        scored[0][0] if scored else 0.0,
        len(rows),
    )
    return result
