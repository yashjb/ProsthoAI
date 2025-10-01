"""Pydantic schemas for request/response validation."""

from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


# ── Request ──────────────────────────────────────────────────────────────────

class CaseInput(BaseModel):
    """Clinical case details from the input form."""

    patient_age: str = ""
    patient_sex: str = ""
    chief_complaint: str = Field(default="", description="Primary reason for visit")
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

    @field_validator('patient_age')
    @classmethod
    def validate_age(cls, v: str) -> str:
        """Validate patient age is reasonable if provided."""
        if v and v.strip():
            try:
                age = int(v)
                if age < 0 or age > 150:
                    raise ValueError("Age must be between 0 and 150")
            except ValueError:
                pass  # Allow non-numeric entries for flexibility
        return v


# ── Response sub-models ──────────────────────────────────────────────────────

class DiagnosisClassification(BaseModel):
    """Specific diagnosis with classification (e.g. Turner & Missirlian)."""
    classification_system: str = ""
    specific_class: str = ""
    definitive_diagnosis: str = ""
    clinical_justification: str = ""
    differential_reasoning: str = ""
    pdf_references: list[str] = []


class RehabilitationTechnique(BaseModel):
    """Full-mouth rehabilitation technique details."""
    technique_name: str = ""
    detailed_description: str = ""
    why_selected: str = ""
    why_not_alternatives: str = ""
    pdf_references: list[str] = []


class OcclusalConcept(BaseModel):
    """Occlusal concept with clinical application."""
    concept_name: str = ""
    clinical_application: str = ""
    pdf_references: list[str] = []


class OcclusalScheme(BaseModel):
    """Occlusal scheme with justification."""
    scheme_name: str = ""
    justification: str = ""
    pdf_references: list[str] = []


class TreatmentStep(BaseModel):
    """A single step inside a treatment phase."""
    step_number: int = 0
    what_is_done: str = ""
    why_it_is_done: str = ""
    clinical_procedure_details: str = ""
    investigations_and_materials: str = ""
    precautions: list[str] = []
    common_errors_to_avoid: list[str] = []
    pdf_references: list[str] = []


class TreatmentPhase(BaseModel):
    """A named phase of the treatment plan containing detailed steps."""
    phase_name: str = ""
    steps: list[TreatmentStep] = []


class AlternativeOption(BaseModel):
    option: str = ""
    indications: list[str] = []
    limitations: list[str] = []
    when_to_choose: str = ""
    pdf_references: list[str] = []


class PdfReference(BaseModel):
    """A specific reference from the provided PDF excerpts."""
    source_title: str = ""
    excerpt_or_page: str = ""
    relevance: str = ""


class ExternalReference(BaseModel):
    """An external evidence-based reference (journal/textbook)."""
    source: str = ""
    summary: str = ""
    why_it_matters: str = ""


class ConflictOrUpdate(BaseModel):
    older_pdf_position: str = ""
    newer_understanding: str = ""
    clinical_impact: str = ""


class EvidenceBreakdown(BaseModel):
    pdf_references: list[PdfReference] = []
    external_references: list[ExternalReference] = []
    conflicts_or_updates: list[ConflictOrUpdate] = []


class MaterialChoice(BaseModel):
    """Material recommendation with rationale."""
    material: str = ""
    where_used: str = ""
    rationale: str = ""
    pdf_references: list[str] = []


class PhotoAnalysisFinding(BaseModel):
    """Finding from a clinical photograph."""
    photo_label: str = ""
    observations: str = ""
    clinical_significance: str = ""


# ── Main response ────────────────────────────────────────────────────────────

class TreatmentResponse(BaseModel):
    """Structured treatment-planning response returned by the AI."""

    case_summary: str = ""
    photo_analysis: list[PhotoAnalysisFinding] = []
    need_more_information: list[str] = []
    red_flags: list[str] = []

    # 1. Diagnosis
    diagnosis: DiagnosisClassification = Field(
        default_factory=DiagnosisClassification
    )

    # 2. Rehabilitation
    rehabilitation_technique: RehabilitationTechnique = Field(
        default_factory=RehabilitationTechnique
    )

    # 3. Occlusal concept
    occlusal_concept: OcclusalConcept = Field(
        default_factory=OcclusalConcept
    )

    # 4. Occlusal scheme
    occlusal_scheme: OcclusalScheme = Field(
        default_factory=OcclusalScheme
    )

    # 5. Step-by-step treatment plan
    treatment_phases: list[TreatmentPhase] = []

    # Alternatives
    alternative_options: list[AlternativeOption] = []

    # Materials
    material_choices: list[MaterialChoice] = []

    # Remaining useful sections
    prosthodontic_considerations: list[str] = []
    maintenance_protocol: list[str] = []
    risks_and_complications: list[str] = []
    patient_communication_points: list[str] = []

    # Evidence
    evidence_breakdown: EvidenceBreakdown = Field(
        default_factory=EvidenceBreakdown
    )

    confidence_level: str = "medium"
    disclaimer: str = ""

    class Config:
        """Pydantic model configuration."""
        json_schema_extra = {
            "example": {
                "case_summary": "Brief clinical summary",
                "confidence_level": "high"
            }
        }


class APIResponse(BaseModel):
    """Wrapper returned to the frontend."""

    success: bool
    data: TreatmentResponse | None = None
    error: str | None = None
