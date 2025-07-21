/* ── Types matching the backend JSON schema ── */

export interface CaseInput {
  patient_age: string;
  patient_sex: string;
  chief_complaint: string;
  medical_history: string;
  dental_history: string;
  extraoral_findings: string;
  intraoral_findings: string;
  periodontal_findings: string;
  endodontic_status: string;
  existing_prosthesis_status: string;
  missing_teeth: string;
  occlusion_notes: string;
  esthetic_concerns: string;
  functional_concerns: string;
  radiographic_findings: string;
  provisional_diagnosis: string;
  proposed_treatment: string;
  budget_sensitivity: string;
  time_constraints: string;
  patient_expectations: string;
  additional_notes: string;
}

export const emptyCaseInput: CaseInput = {
  patient_age: '',
  patient_sex: '',
  chief_complaint: '',
  medical_history: '',
  dental_history: '',
  extraoral_findings: '',
  intraoral_findings: '',
  periodontal_findings: '',
  endodontic_status: '',
  existing_prosthesis_status: '',
  missing_teeth: '',
  occlusion_notes: '',
  esthetic_concerns: '',
  functional_concerns: '',
  radiographic_findings: '',
  provisional_diagnosis: '',
  proposed_treatment: '',
  budget_sensitivity: '',
  time_constraints: '',
  patient_expectations: '',
  additional_notes: '',
};

export interface TreatmentPhase {
  phase_name: string;
  steps: string[];
  rationale: string;
}

export interface RecommendedTreatmentPlan {
  summary: string;
  phases: TreatmentPhase[];
}

export interface AlternativeOption {
  option: string;
  indications: string[];
  limitations: string[];
  when_to_choose: string;
}

export interface PdfMemoryRef {
  source_title: string;
  excerpt: string;
  relevance: string;
}

export interface LatestKnowledgeRef {
  topic: string;
  summary: string;
  why_it_matters: string;
}

export interface ConflictOrUpdate {
  older_pdf_position: string;
  newer_understanding: string;
  clinical_impact: string;
}

export interface EvidenceBreakdown {
  pdf_memory: PdfMemoryRef[];
  latest_knowledge: LatestKnowledgeRef[];
  conflicts_or_updates: ConflictOrUpdate[];
}

export interface TreatmentResponse {
  case_summary: string;
  need_more_information: string[];
  red_flags: string[];
  working_assessment: string;
  treatment_objectives: string[];
  recommended_treatment_plan: RecommendedTreatmentPlan;
  alternative_options: AlternativeOption[];
  required_investigations: string[];
  prosthodontic_considerations: string[];
  occlusion_considerations: string[];
  indications: string[];
  contraindications: string[];
  choice_of_material: string[];
  material_options: string[];
  maintenance_protocol: string[];
  risks_and_contraindications: string[];
  patient_communication_points: string[];
  evidence_breakdown: EvidenceBreakdown;
  confidence_level: string;
  disclaimer: string;
}

export interface APIResponse {
  success: boolean;
  data: TreatmentResponse | null;
  error: string | null;
}
