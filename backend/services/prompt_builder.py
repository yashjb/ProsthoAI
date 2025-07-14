"""Build the system and user prompts for the OpenAI API call."""

from __future__ import annotations

from models.schemas import CaseInput

SYSTEM_PROMPT = """You are a highly experienced MDS Prosthodontist acting as a clinical decision-support assistant. You have deep expertise in:
- Fixed prosthodontics (crowns, bridges, veneers, inlays/onlays)
- Removable prosthodontics (complete dentures, removable partial dentures, overdentures)
- Implant prosthodontics (implant-supported fixed and removable prostheses)
- Occlusion and TMD management
- Esthetic rehabilitation & smile design
- Full mouth rehabilitation
- Medically compromised dental patients
- Interdisciplinary treatment planning

STRICT RULES YOU MUST FOLLOW:
1. You are a DECISION-SUPPORT tool — NEVER present output as a final diagnosis or a replacement for a qualified prosthodontist/dentist.
2. Clearly separate what comes from the uploaded PDF references, what comes from your latest training knowledge, and what is your synthesized inference.
3. When clinical information is incomplete, explicitly list what is missing in "need_more_information".
4. If there are RED FLAGS (urgent/serious risk situations such as suspected malignancy, airway compromise, uncontrolled systemic disease), list them prominently in "red_flags".
5. NEVER fabricate citations, paper titles, DOIs, or author names. If you reference something, it must come from the provided PDF excerpts or be clearly marked as general professional knowledge.
6. If the PDF content conflicts with newer evidence, you MUST explicitly describe the conflict in "evidence_breakdown.conflicts_or_updates".
7. Express your overall confidence as "low", "medium", or "high" based on completeness of clinical data and strength of evidence.
8. Always include a medical disclaimer.
9. Respond ONLY with valid JSON matching the exact schema provided. No markdown fences, no commentary outside the JSON.

RESPONSE TONE:
Professional, clinically precise, evidence-informed, and multidisciplinary-aware. Write as a senior consultant would when discussing a case with a colleague — concise but thorough.
"""


def _format_pdf_context(chunks: list[dict[str, str]]) -> str:
    """Format retrieved PDF chunks into a single context block."""
    if not chunks:
        return "No PDF reference material was provided for this case."

    parts: list[str] = []
    for i, chunk in enumerate(chunks, 1):
        source = chunk.get("source", "Unknown source")
        text = chunk["text"]
        parts.append(f"--- PDF Excerpt {i} (Source: {source}) ---\n{text}")
    return "\n\n".join(parts)


def _format_case(case: CaseInput) -> str:
    """Format case fields into a readable block, skipping empty fields."""
    fields = [
        ("Patient Age", case.patient_age),
        ("Patient Sex", case.patient_sex),
        ("Chief Complaint", case.chief_complaint),
        ("Medical History", case.medical_history),
        ("Dental History", case.dental_history),
        ("Extraoral Findings", case.extraoral_findings),
        ("Intraoral Findings", case.intraoral_findings),
        ("Periodontal Findings", case.periodontal_findings),
        ("Endodontic Status", case.endodontic_status),
        ("Existing Prosthesis Status", case.existing_prosthesis_status),
        ("Missing Teeth / Abutment Teeth", case.missing_teeth),
        ("Occlusion Notes", case.occlusion_notes),
        ("Esthetic Concerns", case.esthetic_concerns),
        ("Functional Concerns", case.functional_concerns),
        ("Radiographic Findings", case.radiographic_findings),
        ("Provisional Diagnosis", case.provisional_diagnosis),
        ("Proposed Treatment by Clinician", case.proposed_treatment),
        ("Budget Sensitivity", case.budget_sensitivity),
        ("Time Constraints", case.time_constraints),
        ("Patient Expectations", case.patient_expectations),
        ("Additional Notes", case.additional_notes),
    ]
    lines = [f"• {label}: {value}" for label, value in fields if value.strip()]
    return "\n".join(lines) if lines else "No structured case details provided."


RESPONSE_SCHEMA_INSTRUCTION = """
You MUST respond with a single JSON object using exactly this schema (no extra keys, no missing keys):
{
  "case_summary": "<string>",
  "need_more_information": ["<string>", ...],
  "red_flags": ["<string>", ...],
  "working_assessment": "<string>",
  "treatment_objectives": ["<string>", ...],
  "recommended_treatment_plan": {
    "summary": "<string>",
    "phases": [
      {"phase_name": "<string>", "steps": ["<string>", ...], "rationale": "<string>"}
    ]
  },
  "alternative_options": [
    {"option": "<string>", "indications": ["<string>"], "limitations": ["<string>"], "when_to_choose": "<string>"}
  ],
  "required_investigations": ["<string>", ...],
  "prosthodontic_considerations": ["<string>", ...],
  "occlusion_considerations": ["<string>", ...],
  "indications": ["<string — clinical indications for the recommended treatment>", ...],
  "contraindications": ["<string — absolute and relative contraindications>", ...],
  "choice_of_material": ["<string — recommended materials with rationale for each>", ...],
  "material_options": ["<string>", ...],
  "maintenance_protocol": ["<string>", ...],
  "risks_and_contraindications": ["<string>", ...],
  "patient_communication_points": ["<string>", ...],
  "evidence_breakdown": {
    "pdf_memory": [{"source_title": "<string>", "excerpt": "<string>", "relevance": "<string>"}],
    "latest_knowledge": [{"topic": "<string>", "summary": "<string>", "why_it_matters": "<string>"}],
    "conflicts_or_updates": [{"older_pdf_position": "<string>", "newer_understanding": "<string>", "clinical_impact": "<string>"}]
  },
  "confidence_level": "low | medium | high",
  "disclaimer": "<string — must state this is not a diagnosis and does not replace professional clinical judgment>"
}
"""


def build_messages(
    case: CaseInput,
    relevant_chunks: list[dict[str, str]],
) -> list[dict[str, str]]:
    """Return the messages list for the OpenAI chat completion call."""
    pdf_context = _format_pdf_context(relevant_chunks)
    case_text = _format_case(case)

    user_content = f"""## Uploaded PDF Reference Material
{pdf_context}

## Patient Case Details
{case_text}

## Instructions
1. Use the PDF reference material above as your PRIMARY knowledge base for this case.
2. ALSO incorporate your latest clinical knowledge and evidence-based prosthodontic guidelines to enhance the response.
3. If the PDF content is outdated or conflicts with newer evidence, state the conflict explicitly.
4. Identify any missing information that would improve the treatment plan.
5. Flag any red-flag situations.
6. Provide a structured, phased treatment plan with alternatives.

{RESPONSE_SCHEMA_INSTRUCTION}
"""

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]
