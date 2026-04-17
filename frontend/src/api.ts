import type { APIResponse, CaseInput, ClinicalPhotos, ShadeMatchingResponse } from './types';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

/**
 * Vercel serverless body limit is 4.5 MB. We reserve ~100 KB for the JSON
 * case_data field + multipart overhead, leaving ~4.4 MB for images.
 */
const VERCEL_BODY_LIMIT = 4.4 * 1024 * 1024;

const RAW_EXTENSIONS = new Set(['.dng', '.cr2', '.cr3', '.nef', '.arw', '.orf', '.raf', '.rw2']);

function isRawFile(name: string): boolean {
  const ext = '.' + name.split('.').pop()?.toLowerCase();
  return RAW_EXTENSIONS.has(ext);
}

/**
 * Extract the largest embedded JPEG from a RAW/DNG file.
 */
async function extractJpegFromRaw(file: File): Promise<Blob | null> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let bestStart = -1;
  let bestLength = 0;
  let currentStart = -1;
  for (let i = 0; i < bytes.length - 1; i++) {
    if (bytes[i] === 0xff) {
      if (bytes[i + 1] === 0xd8) {
        currentStart = i;
      } else if (bytes[i + 1] === 0xd9 && currentStart >= 0) {
        const len = i + 2 - currentStart;
        if (len > bestLength) {
          bestStart = currentStart;
          bestLength = len;
        }
        currentStart = -1;
      }
    }
  }
  if (bestStart >= 0 && bestLength > 1000) {
    return new Blob([bytes.slice(bestStart, bestStart + bestLength)], { type: 'image/jpeg' });
  }
  return null;
}

/**
 * Resize a browser-readable image via canvas, returning a JPEG blob.
 * Tries progressively smaller dimensions / quality to hit targetBytes.
 */
async function resizeImageBlob(
  blob: Blob,
  maxDim = 2048,
  quality = 0.82,
  targetBytes = VERCEL_BODY_LIMIT,
): Promise<Blob> {
  let result = await _canvasToJpeg(blob, maxDim, quality);
  // If already within budget, return immediately
  if (result.size <= targetBytes) return result;
  // Reduce until within budget
  for (const dim of [1600, 1200, 800]) {
    for (const q of [0.7, 0.5]) {
      result = await _canvasToJpeg(blob, dim, q);
      if (result.size <= targetBytes) return result;
    }
  }
  return result; // best effort
}

function _canvasToJpeg(blob: Blob, maxDim: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Canvas compression failed'))),
        'image/jpeg',
        quality,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
}

/**
 * Compress an image file to fit within a per-file byte budget.
 * @param budgetBytes  max bytes this single file should occupy
 */
async function compressForUpload(file: File, budgetBytes = VERCEL_BODY_LIMIT): Promise<Blob> {
  // RAW files: extract the embedded JPEG, then always run through canvas
  // to apply EXIF orientation (the embedded preview is often physically inverted).
  if (isRawFile(file.name)) {
    const jpeg = await extractJpegFromRaw(file);
    if (jpeg) return resizeImageBlob(jpeg, 2048, 0.82, budgetBytes);
    return file;
  }

  // Regular image small enough already
  if (file.size <= budgetBytes) return file;

  // Compress via canvas
  return resizeImageBlob(file, 2048, 0.82, budgetBytes);
}

export async function analyzeCase(
  caseData: CaseInput,
  photos: ClinicalPhotos = {},
): Promise<APIResponse> {
  const formData = new FormData();
  formData.append('case_data', JSON.stringify(caseData));
  // Count total photos to compute per-file byte budget
  let photoCount = 0;
  for (const value of Object.values(photos)) {
    if (!value) continue;
    photoCount += Array.isArray(value) ? value.length : 1;
  }
  const perFileBudget = photoCount > 0
    ? Math.floor(VERCEL_BODY_LIMIT / photoCount)
    : VERCEL_BODY_LIMIT;
  // Append clinical photographs (compressed to stay under Vercel body limit)
  for (const [key, value] of Object.entries(photos)) {
    if (!value) continue;
    if (Array.isArray(value)) {
      for (const file of value) {
        const blob = await compressForUpload(file, perFileBudget);
        const name = blob !== file ? file.name.replace(/\.[^.]+$/, '.jpg') : file.name;
        formData.append(`photo_${key}`, blob, name);
      }
    } else {
      const blob = await compressForUpload(value, perFileBudget);
      const name = blob !== value ? value.name.replace(/\.[^.]+$/, '.jpg') : value.name;
      formData.append(`photo_${key}`, blob, name);
    }
  }

  const res = await fetch(`${API_BASE}/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = body?.detail ?? res.statusText;
    throw new Error(`Server error (${res.status}): ${detail}`);
  }

  return res.json();
}

export async function analyzeShade(file: File): Promise<ShadeMatchingResponse> {
  const formData = new FormData();
  const compressed = await compressForUpload(file);
  // If the file was converted to JPEG, use a .jpg extension so the backend
  // doesn't try to run rawpy on already-decoded JPEG bytes.
  const name = compressed !== file
    ? file.name.replace(/\.[^.]+$/, '.jpg')
    : file.name;
  formData.append('file', compressed, name);

  const res = await fetch(`${API_BASE}/shade-matching`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = body?.error ?? body?.detail ?? res.statusText;
    throw new Error(`Server error (${res.status}): ${detail}`);
  }

  return res.json();
}
