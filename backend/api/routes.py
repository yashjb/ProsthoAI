"""API route for treatment planning."""

from __future__ import annotations

import logging

from fastapi import APIRouter, File, Form, UploadFile, HTTPException

from models.schemas import APIResponse, CaseInput
from services.pdf_extractor import extract_texts_from_pdfs
from services.chunker import chunk_text
from services.retriever import retrieve_relevant_chunks
from services.prompt_builder import build_messages
from services.openai_service import call_openai
from services.response_validator import validate_response
from config.settings import settings

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/analyze", response_model=APIResponse)
async def analyze_case(
    case_data: str = Form(...),
    files: list[UploadFile] = File(default=[]),
):
    """Accept case details (JSON string) + optional PDFs and return a
    structured treatment-planning response."""

    # ── 1. Parse case input ──────────────────────────────────────────────
    try:
        case = CaseInput.model_validate_json(case_data)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Invalid case data: {exc}")

    # ── 2. Validate uploads ──────────────────────────────────────────────
    if len(files) > settings.max_pdfs_per_request:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {settings.max_pdfs_per_request} PDFs allowed per request.",
        )

    pdf_inputs: list[tuple[str, bytes]] = []
    for f in files:
        if f.content_type and "pdf" not in f.content_type.lower():
            raise HTTPException(status_code=400, detail=f"File '{f.filename}' is not a PDF.")
        content = await f.read()
        if len(content) > settings.max_pdf_size_mb * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail=f"File '{f.filename}' exceeds {settings.max_pdf_size_mb} MB limit.",
            )
        pdf_inputs.append((f.filename or "upload.pdf", content))

    # ── 3. Extract PDF text ──────────────────────────────────────────────
    pdf_docs = extract_texts_from_pdfs(pdf_inputs)
    logger.info("Extracted text from %d PDF(s)", len(pdf_docs))

    # ── 4. Chunk ─────────────────────────────────────────────────────────
    all_chunks: list[dict[str, str]] = []
    for doc in pdf_docs:
        chunks = chunk_text(doc["text"], source=doc["filename"])
        all_chunks.extend(chunks)
    logger.info("Total chunks: %d", len(all_chunks))

    # ── 5. Retrieve relevant chunks ──────────────────────────────────────
    query = " ".join(
        filter(
            None,
            [
                case.chief_complaint,
                case.provisional_diagnosis,
                case.proposed_treatment,
                case.intraoral_findings,
                case.missing_teeth,
            ],
        )
    )
    relevant = retrieve_relevant_chunks(all_chunks, query)

    # ── 6. Build prompt & call OpenAI ────────────────────────────────────
    messages = build_messages(case, relevant)
    try:
        raw_response = call_openai(messages)
    except Exception as exc:
        logger.error("OpenAI call failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"AI service error: {exc}")

    # ── 7. Validate & return ─────────────────────────────────────────────
    treatment = validate_response(raw_response)
    return APIResponse(success=True, data=treatment)
