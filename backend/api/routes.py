"""API route for treatment planning."""

from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

from fastapi import APIRouter, HTTPException, File, Form, UploadFile
from fastapi.responses import JSONResponse

from config.settings import settings
from models.schemas import APIResponse, CaseInput
from services.embedding_store import retrieve as retrieve_chunks
from services.image_processor import process_image_for_openai
from services.prompt_builder import build_messages
from services.openai_service import call_openai, call_openai_vision
from services.response_validator import validate_response

logger = logging.getLogger(__name__)

router = APIRouter()

# Mapping: form-field name → human-readable label shown to the AI
_PHOTO_FIELDS: list[tuple[str, str]] = [
    ("photo_extraoral_smile", "Extraoral photograph with smile"),
    ("photo_intraoral_cheek_retracted", "Intraoral photograph with cheek retracted"),
    ("photo_maxillary_arch", "Maxillary arch photograph"),
    ("photo_mandibular_arch", "Mandibular arch photograph"),
    ("photo_occlusion_left_lateral", "Occlusion — Left lateral"),
    ("photo_occlusion_right_lateral", "Occlusion — Right lateral"),
    ("photo_occlusion_frontal", "Occlusion — Frontal view"),
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
    photo_radiographic_record: list[UploadFile] = File(default=[]),
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
    }

    image_parts: list[dict[str, Any]] = []

    # Read all uploads first (async I/O), then process images concurrently
    _pending: list[tuple[str, str, bytes]] = []  # (label, filename, raw_bytes)
    for field_name, label in _PHOTO_FIELDS:
        upload = uploads_map.get(field_name)
        if upload is None or upload.filename is None:
            continue
        raw_bytes = await upload.read()
        _pending.append((label, upload.filename, raw_bytes))

    for idx, upload in enumerate(photo_radiographic_record):
        if upload.filename is None:
            continue
        raw_bytes = await upload.read()
        label = f"Radiographic record (CBCT/OPG/Lateral Ceph) #{idx + 1}"
        _pending.append((label, upload.filename or "image", raw_bytes))

    # Process images in parallel (CPU-bound DNG conversion benefits from threads)
    loop = asyncio.get_running_loop()

    async def _process(label: str, filename: str, raw_bytes: bytes) -> dict[str, Any] | None:
        try:
            part = await loop.run_in_executor(None, process_image_for_openai, raw_bytes, filename)
            if part:
                logger.info("  Image OK: %s (%s)", label, filename)
                return {"label": label, "content": part}
        except Exception as exc:
            logger.warning("  Image skip: %s — %s", filename, exc)
        return None

    results = await asyncio.gather(*[_process(l, f, b) for l, f, b in _pending])
    image_parts = [r for r in results if r is not None]

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

    relevant = retrieve_chunks(query) if query.strip() else []
    logger.info("Retrieved %d relevant PDF chunks", len(relevant))

    # ── 5. Build prompt & call OpenAI ────────────────────────────────────
    # Images were already analysed by the vision model; pass only the text
    # findings to the main call to avoid re-sending large base64 payloads.
    # Truncate vision findings to keep the total prompt manageable.
    truncated_findings = image_findings[:6000] if image_findings else ""
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


# ── Shade Matching Endpoint ──────────────────────────────────────────────

@router.post("/shade-matching")
async def shade_matching(file: UploadFile = File(...)):
    """Analyze a dental image and return shade matching information."""
    try:
        # Validate file is an image (allow common image/* types and RAW formats
        # identified by extension: DNG, CR2, NEF, ARW, etc.)
        raw_exts = {".dng", ".cr2", ".cr3", ".nef", ".arw", ".orf", ".raf", ".rw2"}
        filename_ext = os.path.splitext(file.filename or "")[1].lower()
        is_raw = filename_ext in raw_exts
        content_type = file.content_type or ""
        if not content_type.startswith("image/") and not is_raw:
            return JSONResponse(
                status_code=400,
                content={"error": "File must be an image (PNG, JPEG, GIF, WEBP, DNG, or other RAW format)"},
            )

        # Read uploaded bytes and convert to JPEG via the shared image processor
        # (handles DNG/RAW formats, resizes, and ensures OpenAI-compatible encoding)
        contents = await file.read()
        filename = file.filename or "image"

        logger.info("Shade matching: processing %s (%d bytes)", filename, len(contents))

        image_part = process_image_for_openai(contents, filename)
        if image_part is None:
            return JSONResponse(
                status_code=422,
                content={"error": "Could not process the uploaded image. Please upload a valid dental photograph."},
            )

        # image_part["image_url"]["url"] is already a data:image/jpeg;base64,… string
        jpeg_data_url = image_part["image_url"]["url"]

        # Use the shared OpenAI client from openai_service
        from services.openai_service import _get_client

        client = _get_client()

        response = client.chat.completions.create(
            model=settings.vision_model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a dental shade matching expert. Analyze the teeth in the image "
                        "and provide detailed shade information for creating dental crowns.\n\n"
                        "Detect whether the image was taken under lighting with a color temperature "
                        "around 5500 Kelvin (daylight-balanced) or under natural light conditions, "
                        "and consider how this may affect shade perception.\n\n"
                        "Provide your response in the following JSON format:\n"
                        "{\n"
                        '  "primary_shade": "The main shade code (e.g., A1, B2, C3)",\n'
                        '  "shade_family": "The shade family (A, B, C, or D)",\n'
                        '  "value": "Light, Medium, or Dark",\n'
                        '  "chroma": "Low, Medium, or High intensity",\n'
                        '  "hue": "Reddish-brown, Reddish-yellow, Gray, or Reddish-gray",\n'
                        '  "recommended_shades": ["List of 3-5 closest matching shade codes"],\n'
                        '  "notes": "Additional observations about the tooth color, translucency, '
                        'and any special considerations for crown matching, including lighting '
                        'conditions and their impact",\n'
                        '  "confidence": "High, Medium, or Low confidence in the shade assessment"\n'
                        "}\n\n"
                        "Be specific and professional in your analysis."
                    ),
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "Analyze this dental image and provide detailed shade matching "
                                "information for crown creation. Focus on the teeth visible in "
                                "the image and determine the best shade match."
                            ),
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": jpeg_data_url},
                        },
                    ],
                },
            ],
        )

        # Extract and clean the response
        shade_analysis_raw = response.choices[0].message.content or ""
        shade_analysis = shade_analysis_raw.strip()
        if shade_analysis.startswith("```json"):
            shade_analysis = shade_analysis[7:]
        if shade_analysis.startswith("```"):
            shade_analysis = shade_analysis[3:]
        if shade_analysis.endswith("```"):
            shade_analysis = shade_analysis[:-3]
        shade_analysis = shade_analysis.strip()

        logger.info("Shade analysis completed successfully")

        return {
            "success": True,
            "image_data": jpeg_data_url,
            "shade_analysis": shade_analysis,
            "filename": filename,
        }

    except Exception as exc:
        logger.error("Shade matching failed: %s", exc, exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": f"Shade analysis failed: {exc}"},
        )
 