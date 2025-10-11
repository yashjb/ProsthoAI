"""API route for treatment planning."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException, File, Form, UploadFile, HTTPException

from models.schemas import APIResponse, CaseInput
from services.embedding_store import retrieve as retrieve_chunks
from services.image_processor import process_image_for_openai
from services.prompt_builder import build_messages
from services.openai_service import call_openai, call_openai_vision
from services.response_validator import validate_response

logger = logging.getLogger(__name__)

router = APIRouter()

# -- Photo field configuration ----------------------------------------
# Mapping: form-field name → human-readable label shown to the AI
_PHOTO_FIELDS: list[tuple[str, str]] = [
    ("photo_extraoral_smile", "Extraoral photograph with smile"),
    ("photo_intraoral_cheek_retracted", "Intraoral photograph with cheek retracted"),
    ("photo_maxillary_arch", "Maxillary arch photograph"),
    ("photo_mandibular_arch", "Mandibular arch photograph"),
    ("photo_occlusion_left_lateral", "Occlusion — Left lateral"),
    ("photo_occlusion_right_lateral", "Occlusion — Right lateral"),
    ("photo_occlusion_frontal", "Occlusion — Frontal view"),
    ("photo_cbct_dicom", "CBCT scan"),
]


@router.post("/analyze", response_model=APIResponse)
async def analyze_case(
    case_data: str = Form(...),
    photo_extraoral_smile: UploadFile | None = File(default=None),
    photo_intraoral_cheek_retracted: UploadFile | None = File(default=None),
    photo_maxillary_arch: UploadFile | None = File(default=None),
    photo_mandibular_arch: UploadFile | None = File(default=None),
    photo_occlusion_left_lateral: UploadFile | None = File(default=None),
    photo_occlusion_right_lateral: UploadFile | None = File(default=None),
    photo_occlusion_frontal: UploadFile | None = File(default=None),
    photo_cbct_dicom: UploadFile | None = File(default=None),
):
    """Accept case details + optional clinical photographs and return a
    structured treatment-planning response.

    Pipeline:
    1. Parse case data
    2. Process clinical photographs → vision analysis → structured findings
    3. Semantic retrieval from parquet embedding store
    4. Build prompt with PDF context + image findings + case data
    5. Final LLM call for full treatment plan
    """

    # ── 1. Parse case input ──────────────────────────────────────────────
    try:
        case = CaseInput.model_validate_json(case_data)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Invalid case data: {exc}")

    # ── 2. Process uploaded clinical photographs ─────────────────────────
    uploads_map = {
        "photo_extraoral_smile": photo_extraoral_smile,
        "photo_intraoral_cheek_retracted": photo_intraoral_cheek_retracted,
        "photo_maxillary_arch": photo_maxillary_arch,
        "photo_mandibular_arch": photo_mandibular_arch,
        "photo_occlusion_left_lateral": photo_occlusion_left_lateral,
        "photo_occlusion_right_lateral": photo_occlusion_right_lateral,
        "photo_occlusion_frontal": photo_occlusion_frontal,
        "photo_cbct_dicom": photo_cbct_dicom,
    }

    image_parts: list[dict[str, Any]] = []
    for field_name, label in _PHOTO_FIELDS:
        upload = uploads_map.get(field_name)
        if upload is None or upload.filename is None:
            continue
        try:
            raw_bytes = await upload.read()
            part = process_image_for_openai(raw_bytes, upload.filename)
            if part:
                image_parts.append({"label": label, "content": part})
                logger.info("  Image OK: %s (%s)", label, upload.filename)
        except Exception as exc:
            logger.warning("  Image skip: %s — %s", upload.filename, exc)

    # ── 3. Vision analysis — extract findings from photos ────────────────
    image_findings: str = ""
    if image_parts:
        logger.info("Running vision analysis on %d image(s) …", len(image_parts))
        try:
            image_findings = call_openai_vision(image_parts)
            logger.info(
                "Vision findings extracted (%d chars)", len(image_findings)
            )
        except Exception as exc:
            logger.error("Vision analysis failed: %s", exc)
            image_findings = ""

    # ── 4. Semantic retrieval from embedding store ───────────────────────
    query_parts = list(
        filter(
            None,
            [
                case.chief_complaint,
                case.provisional_diagnosis,
                case.proposed_treatment,
                case.intraoral_findings,
                case.missing_teeth,
                case.occlusion_notes,
                case.esthetic_concerns,
                case.functional_concerns,
                image_findings[:500] if image_findings else "",
            ],
        )
    )
    query = " ".join(query_parts)

    logger.debug("Retrieval query length: %d chars", len(query))
    relevant = retrieve_chunks(query) if query.strip() else []
    logger.info("Retrieved %d relevant PDF chunks", len(relevant))

    # ── 5. Build prompt & call OpenAI ────────────────────────────────────
    # Images were already analysed by the vision model; pass only the text
    # findings to the main call to avoid re-sending large base64 payloads.
    # Truncate vision findings to keep the total prompt manageable.
    truncated_findings = image_findings[:8000] if image_findings else ""
    messages = build_messages(
        case,
        relevant,
        image_parts=None,
        image_findings=truncated_findings,
    )
    try:
        raw_response = call_openai(messages)
    except Exception as exc:
        logger.error("OpenAI call failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"AI service error: {exc}")

    # ── 6. Validate & return ─────────────────────────────────────────────
    treatment = validate_response(raw_response)
    return APIResponse(success=True, data=treatment)
