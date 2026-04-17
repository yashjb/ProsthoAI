/* ── localStorage utilities for saving treatment plans and shade results ── */

import type { CaseInput, TreatmentResponse, ShadeAnalysis } from './types';

export interface SavedTreatmentPlan {
  id: string;
  savedAt: string;
  caseInput: CaseInput;
  photoDataUrls: Record<string, string>; // field name → base64 data URL
  treatmentResponse: TreatmentResponse;
}

export interface SavedShadeResult {
  id: string;
  savedAt: string;
  imageData: string; // base64 data URL
  filename: string;
  shadeAnalysis: ShadeAnalysis;
}

const PLANS_KEY = 'prostho_saved_plans';
const SHADES_KEY = 'prostho_saved_shades';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ── Treatment Plans ── */

export function getSavedPlans(): SavedTreatmentPlan[] {
  try {
    const raw = localStorage.getItem(PLANS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePlan(
  caseInput: CaseInput,
  photoDataUrls: Record<string, string>,
  treatmentResponse: TreatmentResponse,
): SavedTreatmentPlan {
  const plan: SavedTreatmentPlan = {
    id: generateId(),
    savedAt: new Date().toISOString(),
    caseInput,
    photoDataUrls,
    treatmentResponse,
  };
  const plans = getSavedPlans();
  plans.unshift(plan);
  localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
  return plan;
}

export function deletePlan(id: string): void {
  const plans = getSavedPlans().filter((p) => p.id !== id);
  localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
}

/* ── Shade Results ── */

export function getSavedShades(): SavedShadeResult[] {
  try {
    const raw = localStorage.getItem(SHADES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveShade(
  imageData: string,
  filename: string,
  shadeAnalysis: ShadeAnalysis,
): SavedShadeResult {
  const shade: SavedShadeResult = {
    id: generateId(),
    savedAt: new Date().toISOString(),
    imageData,
    filename,
    shadeAnalysis,
  };
  const shades = getSavedShades();
  shades.unshift(shade);
  localStorage.setItem(SHADES_KEY, JSON.stringify(shades));
  return shade;
}

export function deleteShade(id: string): void {
  const shades = getSavedShades().filter((s) => s.id !== id);
  localStorage.setItem(SHADES_KEY, JSON.stringify(shades));
}
