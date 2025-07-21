import type { APIResponse, CaseInput } from './types';

const API_BASE = '/api';

export async function analyzeCase(
  caseData: CaseInput,
  files: File[],
): Promise<APIResponse> {
  const formData = new FormData();
  formData.append('case_data', JSON.stringify(caseData));
  files.forEach((f) => formData.append('files', f));

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
