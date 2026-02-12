"""Build the system and user prompts for the OpenAI API call."""
# Constructs few-shot clinical reasoning prompts for GPT-4o/o-series

from __future__ import annotations

from typing import Any

from models.schemas import CaseInput

SYSTEM_PROMPT = """\
You are a senior MDS Prosthodontist with 25+ years of clinical and academic experience in full-mouth rehabilitation, fixed and removable prosthodontics, implant prosthodontics, occlusion, esthetic dentistry, and managing medically compromised patients.

You think and respond like a **clinician conducting a real case discussion**, NOT like a textbook. Every statement you make must be:
- **Case-specific** — directly tied to THIS patient's findings
- **Precisely reasoned** — explain WHY based on the clinical findings
- **Evidence-backed** — reference the PDF excerpts provided, citing the source name after every key claim
- **Actionable** — give concrete procedures, materials, sequences; avoid vague phrases like "as appropriate" or "may be considered"

═══════════════════════════════════════════════════
ABSOLUTE RULES (VIOLATIONS WILL MAKE OUTPUT USELESS)
═══════════════════════════════════════════════════

1. CASE-SPECIFIC ONLY — Do NOT list all possible classifications/techniques/options. Identify THE ONE that applies to this case and justify it against the clinical findings. Mention alternatives only to explain why they are NOT chosen here.

2. REFERENCING IS MANDATORY — After every key clinical statement, include the PDF source name in parentheses, e.g., "(Source: Oral Rehabilitation for Compromised and Elderly Patients)". If a statement cannot be tied to a provided PDF excerpt, clearly mark it as "[External evidence-based knowledge]" and cite the journal/textbook.

3. NEVER FABRICATE REFERENCES — Do not invent PDF page numbers, paper titles, DOIs, or authors. Only cite what is actually present in the provided excerpts.

4. DEPTH OVER BREADTH — A single well-justified diagnosis is worth more than listing five possible ones. A single detailed step-by-step phase is worth more than a shallow overview of all phases.

5. CLINICAL PROCEDURE DETAIL — For every treatment step: state exactly what is done, what instruments/materials are used, what sequence is followed, what precautions apply, and what errors to avoid. Write as if instructing a PG student performing the procedure.

6. NO GENERIC THEORY — Do not explain background concepts unless directly needed to justify a decision for this case. If the patient has generalized attrition, do NOT explain what attrition is — instead classify it, quantify it, and plan for it.

7. PHOTO ANALYSIS — If clinical photographs are provided, describe specific observations from each photograph. Do not say "photographs show attrition" — say "frontal view shows generalized loss of tooth structure in the anterior sextants with exposed dentin on the incisal edges of 11, 21, 31, 41; the maxillary arch photo reveals worn palatal concavities on 13–23 consistent with Category I/II Turner & Missirlian classification."

8. DISAMBIGUATION — When the PDF excerpts contain multiple classification systems or approaches, you MUST pick the one that fits this case and explicitly state why the others do not fit.

9. You are a DECISION-SUPPORT tool. Include a disclaimer that this does NOT replace professional clinical judgment.

10. Respond ONLY with valid JSON matching the exact schema provided. No markdown fences, no commentary outside the JSON.

RESPONSE TONE: Senior consultant discussing a case with a colleague — precise, authoritative, clinically grounded. Every sentence should carry clinical weight.
"""


def _format_pdf_context(chunks: list[dict[str, str]]) -> str:
    if not chunks:
        return "No PDF reference material was provided for this case."
    parts: list[str] = []
    for i, chunk in enumerate(chunks, 1):
        source = chunk.get("source", "Unknown source")
        text = chunk["text"]
        parts.append(f"--- PDF Excerpt {i} (Source: {source}) ---\n{text}")
    return "\n\n".join(parts)


def _format_case(case: CaseInput) -> str:
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
        ("Proposed Treatment by Clinician", case.proposed_treatment),
        ("Budget Sensitivity", case.budget_sensitivity),
        ("Time Constraints", case.time_constraints),
        ("Patient Expectations", case.patient_expectations),
        ("Additional Notes", case.additional_notes),
    ]
    lines = [f"• {label}: {value}" for label, value in fields if value.strip()]
    return "\n".join(lines) if lines else "No structured case details provided."


RESPONSE_SCHEMA_INSTRUCTION = """
═══════════════════════════════════════════════════
RESPONSE JSON SCHEMA (respond with EXACTLY this structure)
═══════════════════════════════════════════════════

{
  "case_summary": "<Concise but clinically rich summary. Correlate chief complaint, clinical findings, medical history, and photograph observations into a cohesive clinical picture. Do NOT just list the fields back.>",

  "photo_analysis": [
    {
      "photo_label": "<e.g. Extraoral photograph with smile>",
      "observations": "<Specific clinical observations — tooth-by-tooth where relevant, gingival conditions, occlusal relationships, arch form, attrition patterns, shade, smile line, lip competence, etc.>",
      "clinical_significance": "<How these findings affect diagnosis and treatment planning for THIS case>"
    }
  ],

  "need_more_information": ["<Specific missing data that would change or refine the plan, e.g. 'Periapical radiograph of 36 to assess remaining root structure'>"],

  "red_flags": ["<Only genuine urgent concerns for THIS patient, e.g. 'History of nasopharyngeal carcinoma — must confirm radiation therapy status before any implant planning; risk of osteoradionecrosis'>"],

  "diagnosis": {
    "classification_system": "<e.g. Turner and Missirlian Classification of Worn Dentition>",
    "specific_class": "<The EXACT class that applies — e.g. 'Category I: Excessive wear with loss of VDO' — no listing of all categories>",
    "definitive_diagnosis": "<Full definitive diagnosis statement for this case>",
    "clinical_justification": "<Tie the diagnosis to specific clinical findings: which teeth show what pattern, what the occlusion reveals, how the VDO is affected, what the radiographs show. Reference PDF excerpts.>",
    "differential_reasoning": "<Why other categories/diagnoses were ruled out based on THIS patient's findings>",
    "pdf_references": ["(Source: filename, relevant excerpt/concept)"]
  },

  "rehabilitation_technique": {
    "technique_name": "<e.g. Hobo Twin-Stage Technique / Pankey-Mann-Schuyler / Dawson>",
    "detailed_description": "<How this technique is applied step-by-step in THIS case — not a textbook definition>",
    "why_selected": "<Case-specific justification>",
    "why_not_alternatives": "<Why other techniques are NOT suitable for this specific case>",
    "pdf_references": ["(Source: filename, relevant excerpt/concept)"]
  },

  "occlusal_concept": {
    "concept_name": "<e.g. Conformative Approach / Reorganized Approach>",
    "clinical_application": "<How this concept applies clinically to THIS case>",
    "pdf_references": ["(Source: filename, relevant excerpt/concept)"]
  },

  "occlusal_scheme": {
    "scheme_name": "<e.g. Mutually Protected Occlusion / Group Function / Canine-Guided>",
    "justification": "<Case-specific reason for this scheme>",
    "pdf_references": ["(Source: filename, relevant excerpt/concept)"]
  },

  "treatment_phases": [
    {
      "phase_name": "<e.g. Phase 1: Diagnostic Phase>",
      "steps": [
        {
          "step_number": 1,
          "what_is_done": "<Specific procedure>",
          "why_it_is_done": "<Clinical reasoning for THIS case>",
          "clinical_procedure_details": "<Detailed procedure — instruments, sequence, materials, settings — as if writing a PG clinical protocol>",
          "investigations_and_materials": "<Specific materials/investigations needed for this step>",
          "precautions": ["<Stage-specific practical precautions>"],
          "common_errors_to_avoid": ["<Common errors that could compromise this step>"],
          "pdf_references": ["(Source: filename, relevant concept)"]
        }
      ]
    }
  ],

  "alternative_options": [
    {
      "option": "<Alternative treatment approach>",
      "indications": ["<When this alternative would be chosen instead>"],
      "limitations": ["<Why it is NOT the primary choice for THIS case>"],
      "when_to_choose": "<Specific clinical scenario where this becomes first choice>",
      "pdf_references": ["(Source: filename)"]
    }
  ],

  "material_choices": [
    {
      "material": "<e.g. Lithium disilicate (IPS e.max Press)>",
      "where_used": "<Which teeth/restorations — be specific>",
      "rationale": "<Why this material for this location in this patient>",
      "pdf_references": ["(Source: filename)"]
    }
  ],

  "prosthodontic_considerations": ["<Case-specific considerations with PDF references where possible>"],

  "maintenance_protocol": ["<Specific maintenance items for THIS case with timeframes>"],

  "risks_and_complications": ["<Case-specific risks>"],

  "patient_communication_points": ["<What to explain to THIS patient specifically>"],

  "evidence_breakdown": {
    "pdf_references": [
      {
        "source_title": "<PDF filename>",
        "excerpt_or_page": "<Relevant excerpt or concept used from this source>",
        "relevance": "<How it informed the treatment plan>"
      }
    ],
    "external_references": [
      {
        "source": "<Journal/textbook name and year — only if PDF evidence was insufficient>",
        "summary": "<What this source contributes>",
        "why_it_matters": "<Why external evidence was needed here>"
      }
    ]
  },

  "confidence_level": "low | medium | high",
  "disclaimer": "<Must state this is AI-generated decision support and does NOT replace professional clinical judgment.>"
}
"""


def build_messages(
    case: CaseInput,
    relevant_chunks: list[dict[str, str]],
    *,
    image_parts: list[dict[str, Any]] | None = None,
    image_findings: str = "",
) -> list[dict[str, Any]]:
    """Return the messages list for the OpenAI chat completion call."""
    pdf_context = _format_pdf_context(relevant_chunks)
    case_text = _format_case(case)

    findings_section = ""
    if image_findings:
        findings_section = (
            f"\n\n## Automated Clinical Photograph Analysis\n"
            f"(Pre-extracted by vision model — verify and refine using the raw images below)\n\n"
            f"{image_findings}\n"
        )

    photo_instruction = ""
    if image_parts:
        photo_instruction = (
            "\n\n### PHOTOGRAPH ANALYSIS INSTRUCTIONS\n"
            "Clinical photographs are attached below. For EACH photograph:\n"
            "- Describe specific observations tooth-by-tooth where visible\n"
            "- Note gingival conditions, occlusal relationships, arch form\n"
            "- Identify attrition patterns, existing restorations, shade issues\n"
            "- Correlate visual findings with the reported case data\n"
            "- If the automated analysis above missed anything, ADD it\n"
            "- Populate the photo_analysis array in the JSON response"
        )

    text_content = f"""═══════════════════════════════════════════════════
PDF REFERENCE MATERIAL (PRIMARY KNOWLEDGE BASE)
═══════════════════════════════════════════════════
{pdf_context}

═══════════════════════════════════════════════════
PATIENT CASE DATA
═══════════════════════════════════════════════════
{case_text}{findings_section}

═══════════════════════════════════════════════════
YOUR TASK — CASE-SPECIFIC CLINICAL ANALYSIS
═══════════════════════════════════════════════════

Using the PDF excerpts above as your PRIMARY and CORE reference, prepare a **case-specific, precise, and in-depth response** covering:

### 1. Diagnosis (with Classification)
- Identify the EXACT classification applicable to THIS case (e.g., Turner & Missirlian for worn dentition)
- Provide a DEFINITIVE diagnosis — not a broad listing of all possible classes
- Justify using SPECIFIC clinical findings from the case data AND PDF excerpts
- Include differential reasoning only to explain why other classes were ruled out

### 2. Full Mouth Rehabilitation Technique
- Name the SPECIFIC technique indicated for THIS case
- Justify WHY this technique over alternatives — tied to this patient's clinical situation
- Case-driven explanation, not theoretical

### 3. Occlusal Concept
- State the EXACT occlusal concept (conformative vs reorganized)
- Explain its clinical application in THIS patient

### 4. Occlusal Scheme
- State the SPECIFIC scheme (canine-guided, group function, mutually protected, etc.)
- Justify based on THIS case's clinical findings

### 5. Step-by-Step Treatment Plan
Provide a COMPLETE sequential treatment plan with these phases:
- Diagnostic phase
- Pretreatment/preparatory phase
- Provisional/transitional phase
- Definitive phase
- Follow-up/maintenance phase

For EACH step within each phase, you MUST include:
- What is done (specific procedure)
- Why it is done (clinical reasoning for THIS case)
- Clinical procedure details (instruments, materials, sequence)
- Investigations/materials required
- PRECAUTIONS specific to that step
- COMMON ERRORS/COMPLICATIONS to avoid at that step
- PDF source references

### 6. Stage-wise Precautions
- Embed precautions WITHIN each treatment step (not as a separate generic list)
- Make precautions practical and specific to THIS patient's conditions

### 7. Referencing (MANDATORY)
- Cite PDF source name after EVERY key statement
- If a claim doesn't come from the provided PDFs, mark it clearly as [External evidence-based knowledge] with source
- Do NOT include unsupported statements

### 8. External Sources
- Use ONLY if PDF evidence is insufficient for a specific point
- Must be from recent, reputed journals/textbooks
- Clearly distinguish [PDF-based] vs [External evidence-based]{photo_instruction}

{RESPONSE_SCHEMA_INSTRUCTION}
"""

    if image_parts:
        user_content: list[dict[str, Any]] = [{"type": "text", "text": text_content}]
        for img in image_parts:
            user_content.append(
                {"type": "text", "text": f"\n📸 Clinical Photo — {img['label']}:"}
            )
            user_content.append(img["content"])
    else:
        user_content = text_content  # type: ignore[assignment]

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]
