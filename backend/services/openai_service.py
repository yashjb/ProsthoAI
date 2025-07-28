"""Call the OpenAI API and return the raw JSON string."""

from __future__ import annotations

import json
import logging

from openai import OpenAI

from config.settings import settings

logger = logging.getLogger(__name__)

_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.openai_api_key)
    return _client


def call_openai(messages: list[dict[str, str]]) -> str:
    """Send messages to the OpenAI chat completion endpoint.

    Returns the raw content string from the assistant's message.
    Raises on HTTP or API errors.
    """
    client = _get_client()
    logger.info("Calling OpenAI model=%s", settings.openai_model)

    kwargs = {
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

    content = response.choices[0].message.content
    if not content:
        raise ValueError("Empty response from OpenAI")

    logger.info(
        "OpenAI response received — tokens: prompt=%s, completion=%s",
        response.usage.prompt_tokens if response.usage else "?",
        response.usage.completion_tokens if response.usage else "?",
    )
    return content
