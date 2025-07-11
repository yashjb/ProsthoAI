"""Pydantic schemas for request/response validation."""

from __future__ import annotations

from pydantic import BaseModel, Field


# ── Request ──────────────────────────────────────────────────────────────────

class CaseInput(BaseModel):
    """Clinical case details from the input form."""

    patient_age: str = ""
    patient_sex: str = ""
    chief_complaint: str = ""
    medical_history: str = ""
    dental_history: str = ""
    extraoral_findings: str = ""
    intraoral_findings: str = ""
    periodontal_findings: str = ""
    endodontic_status: str = ""
    existing_prosthesis_status: str = ""
    missing_teeth: str = ""
    occlusion_notes: str = ""
    esthetic_concerns: str = ""
    functional_concerns: str = ""
    radiographic_findings: str = ""
    provisional_diagnosis: str = ""
    proposed_treatment: str = ""
    budget_sensitivity: str = ""
    time_constraints: str = ""
    patient_expectations: str = ""
    additional_notes: str = ""


# ── Response sub-models ──────────────────────────────────────────────────────

class TreatmentPhase(BaseModel):
    phase_name: str
    steps: list[str]
    rationale: str


class RecommendedTreatmentPlan(BaseModel):
    summary: str
    phases: list[TreatmentPhase]


class AlternativeOption(BaseModel):
    option: str
    indications: list[str]
    limitations: list[str]
    when_to_choose: str


class PdfMemoryRef(BaseModel):
    source_title: str
    excerpt: str
    relevance: str


class LatestKnowledgeRef(BaseModel):
    topic: str
    summary: str
    why_it_matters: str


class ConflictOrUpdate(BaseModel):
    older_pdf_position: str
    newer_understanding: str
    clinical_impact: str


class EvidenceBreakdown(BaseModel):
    pdf_memory: list[PdfMemoryRef] = []
    latest_knowledge: list[LatestKnowledgeRef] = []
    conflicts_or_updates: list[ConflictOrUpdate] = []


# ── Main response ────────────────────────────────────────────────────────────

class TreatmentResponse(BaseModel):
    """Structured treatment-planning response returned by the AI."""

    case_summary: str = ""
    need_more_information: list[str] = []
    red_flags: list[str] = []
    working_assessment: str = ""
    treatment_objectives: list[str] = []
    recommended_treatment_plan: RecommendedTreatmentPlan = Field(
        default_factory=lambda: RecommendedTreatmentPlan(summary="", phases=[])
    )
    alternative_options: list[AlternativeOption] = []
    required_investigations: list[str] = []
    prosthodontic_considerations: list[str] = []
    occlusion_considerations: list[str] = []
    indications: list[str] = []
    contraindications: list[str] = []
    choice_of_material: list[str] = []
    material_options: list[str] = []
    maintenance_protocol: list[str] = []
    risks_and_contraindications: list[str] = []
    patient_communication_points: list[str] = []
    evidence_breakdown: EvidenceBreakdown = Field(
        default_factory=EvidenceBreakdown
    )
    confidence_level: str = "medium"
    disclaimer: str = ""


class APIResponse(BaseModel):
    """Wrapper returned to the frontend."""

    success: bool
    data: TreatmentResponse | None = None
    error: str | None = None
