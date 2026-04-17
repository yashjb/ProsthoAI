import type { APIResponse, CaseInput, ClinicalPhotos, ShadeMatchingResponse } from './types';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export async function analyzeCase(
  caseData: CaseInput,
  photos: ClinicalPhotos = {},
): Promise<APIResponse> {
  const formData = new FormData();
  formData.append('case_data', JSON.stringify(caseData));

  // Append clinical photographs
  for (const [key, value] of Object.entries(photos)) {
    if (!value) continue;
    if (Array.isArray(value)) {
      for (const file of value) {
        formData.append(`photo_${key}`, file);
      }
    } else {
      formData.append(`photo_${key}`, value);
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
  formData.append('file', file);

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
