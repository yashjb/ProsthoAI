"""Call the OpenAI API and return the raw JSON string."""

from __future__ import annotations

import json
import logging
from typing import Any

from openai import OpenAI

from config.settings import settings

logger = logging.getLogger(__name__)

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(
            api_key=settings.openai_api_key,
            timeout=600.0,   # 10-minute hard timeout for reasoning models
            max_retries=0,   # fail fast — no silent retries that multiply latency
        )
    return _client


def call_openai(messages: list[dict[str, Any]]) -> str:
    """Send messages to the OpenAI chat completion endpoint.

    Supports both plain-text and multimodal (vision) messages.
    Returns the raw content string from the assistant's message.
    Raises on HTTP or API errors.
    """
    client = _get_client()
    logger.info("Calling OpenAI model=%s with %d messages", settings.openai_model, len(messages))

    kwargs: dict[str, Any] = {
        "model": settings.openai_model,
        "messages": messages,
        "temperature": settings.openai_temperature,
        "response_format": {"type": "json_object"},
    }

    if settings.openai_model.startswith("gpt-5") or settings.openai_model.startswith("o"):
        kwargs["max_completion_tokens"] = settings.openai_max_tokens
    else:
        kwargs["max_tokens"] = settings.openai_max_tokens

    response = client.chat.completions.create(**kwargs)

    finish_reason = response.choices[0].finish_reason
    content = response.choices[0].message.content
    logger.info(
        "OpenAI response — tokens: prompt=%s, completion=%s, finish_reason=%s, content_len=%d",
        response.usage.prompt_tokens if response.usage else "?",
        response.usage.completion_tokens if response.usage else "?",
        finish_reason,
        len(content) if content else 0,
    )
    if not content:
        raise ValueError(
            f"Empty response from OpenAI (finish_reason={finish_reason}). "
            f"The model may have exhausted max_completion_tokens ({kwargs.get('max_completion_tokens', kwargs.get('max_tokens'))}) on reasoning."
        )
    return content


# ── Vision analysis (Step 1 of image diagnosis pipeline) ─────────────────

_VISION_SYSTEM = (
    "You are a dental clinical imaging expert. Analyze the provided clinical "
    "photographs and extract structured findings. For each photograph:\n"
    "1. Identify the view type (extraoral, intraoral, occlusal, etc.)\n"
    "2. Describe visible dental conditions: attrition, erosion, caries, "
    "discoloration, fractures, missing teeth, existing restorations\n"
    "3. Note gingival conditions: recession, inflammation, bleeding, biotype\n"
    "4. Assess occlusal relationships if visible\n"
    "5. Note arch form, spacing, crowding\n"
    "6. Describe any prosthetic work visible\n"
    "7. Flag any abnormalities or red flags\n\n"
    "Be precise and clinical. Use FDI tooth notation where possible. "
    "This is NOT a diagnosis — these are observational findings to support "
    "a prosthodontist's assessment."
)


def call_openai_vision(image_parts: list[dict[str, Any]]) -> str:
    """Send clinical photographs for vision analysis.

    Returns a plain-text string of structured clinical findings.
    This is the first step of the diagnosis pipeline — findings are
    then used to search the knowledge base and build the final prompt.
    """
    client = _get_client()
    model = settings.vision_model
    logger.info("Vision analysis: %d image(s), model=%s", len(image_parts), model)

    user_content: list[dict[str, Any]] = [
        {
            "type": "text",
            "text": (
                "Analyze the following clinical dental photographs. "
                "Provide detailed structured findings for each image."
            ),
        }
    ]
    for img in image_parts:
        user_content.append(
            {"type": "text", "text": f"\n📸 {img['label']}:"}
        )
        user_content.append(img["content"])

    kwargs: dict[str, Any] = {
        "model": model,
        "messages": [
            {"role": "system", "content": _VISION_SYSTEM},
            {"role": "user", "content": user_content},
        ],
        "temperature": 0.1,
    }

    if model.startswith("gpt-5") or model.startswith("o"):
        kwargs["max_completion_tokens"] = 16384
    else:
        kwargs["max_tokens"] = 4096

    response = client.chat.completions.create(**kwargs)

    finish_reason = response.choices[0].finish_reason
    content = response.choices[0].message.content or ""
    logger.info(
        "Vision analysis done — tokens: prompt=%s, completion=%s, finish_reason=%s, content_len=%d",
        response.usage.prompt_tokens if response.usage else "?",
        response.usage.completion_tokens if response.usage else "?",
        finish_reason,
        len(content),
    )
    if not content:
        logger.warning(
            "Vision returned empty content (finish_reason=%s). "
            "The model may have exhausted its token budget on reasoning.",
            finish_reason,
        )
    return content
