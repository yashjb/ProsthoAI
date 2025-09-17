"""Convert uploaded images (including DNG / RAW formats) to JPEG for the
OpenAI vision API."""

from __future__ import annotations

import base64
import io
import logging
import os
import tempfile

from PIL import Image

from config.settings import settings

logger = logging.getLogger(__name__)

RAW_EXTENSIONS = {".dng", ".cr2", ".cr3", ".nef", ".arw", ".orf", ".raf", ".rw2", ".heic"}


def _is_raw_format(filename: str) -> bool:
    ext = os.path.splitext(filename)[1].lower()
    return ext in RAW_EXTENSIONS


def _convert_raw_to_pil(file_bytes: bytes, filename: str) -> Image.Image:
    """Convert a RAW image to a PIL Image using *rawpy*."""
    try:
        import rawpy
    except ImportError:
        raise RuntimeError(
            "rawpy is required for RAW image processing. "
            "Install it with:  pip install rawpy numpy"
        )

    ext = os.path.splitext(filename)[1]
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name
        with rawpy.imread(tmp_path) as raw:
            rgb = raw.postprocess(
                use_camera_wb=True,
                half_size=False,
                no_auto_bright=False,
                output_bps=8,
            )
        return Image.fromarray(rgb)
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


def _resize_image(img: Image.Image, max_dim: int) -> Image.Image:
    """Resize so the longest side is at most *max_dim* pixels."""
    w, h = img.size
    if max(w, h) <= max_dim:
        return img
    if w >= h:
        new_w = max_dim
        new_h = int(h * max_dim / w)
    else:
        new_h = max_dim
        new_w = int(w * max_dim / h)
    return img.resize((new_w, new_h), Image.LANCZOS)


def process_image_for_openai(
    file_bytes: bytes,
    filename: str,
) -> dict | None:
    """Return an OpenAI vision content-part dict, or *None* on failure.

    The image is converted to a resized JPEG and base64-encoded.
    """
    try:
        if _is_raw_format(filename):
            logger.info("Converting RAW image: %s", filename)
            img = _convert_raw_to_pil(file_bytes, filename)
        else:
            img = Image.open(io.BytesIO(file_bytes))

        img = _resize_image(img, settings.max_image_dimension)

        if img.mode != "RGB":
            img = img.convert("RGB")

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=settings.image_quality)
        b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

        logger.info(
            "Processed image %s → %dx%d JPEG (base64 %d chars)",
            filename,
            img.size[0],
            img.size[1],
            len(b64),
        )

        return {
            "type": "image_url",
            "image_url": {
                "url": f"data:image/jpeg;base64,{b64}",
                "detail": "high",
            },
        }
    except Exception as exc:
        logger.error("Failed to process image %s: %s", filename, exc)
        return None
