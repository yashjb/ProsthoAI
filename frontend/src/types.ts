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

export interface ClinicalPhotos {
  extraoral_smile?: File;
  intraoral_cheek_retracted?: File;
  maxillary_arch?: File;
  mandibular_arch?: File;
  occlusion_left_lateral?: File;
  occlusion_right_lateral?: File;
  occlusion_frontal?: File;
  cbct_dicom?: File;
}

export const clinicalPhotoFields: { key: keyof ClinicalPhotos; label: string; accept: string; group?: string }[] = [
  { key: 'extraoral_smile', label: '1. Extraoral photograph with smile', accept: 'image/*' },
  { key: 'intraoral_cheek_retracted', label: '2. Intraoral photograph with cheek retracted', accept: 'image/*' },
  { key: 'maxillary_arch', label: '3. Maxillary arch photograph', accept: 'image/*' },
  { key: 'mandibular_arch', label: '4. Mandibular arch photograph', accept: 'image/*' },
  { key: 'occlusion_left_lateral', label: '5a. Occlusion — Left lateral', accept: 'image/*', group: 'Photograph in occlusion' },
  { key: 'occlusion_right_lateral', label: '5b. Occlusion — Right lateral', accept: 'image/*', group: 'Photograph in occlusion' },
  { key: 'occlusion_frontal', label: '5c. Occlusion — Frontal view', accept: 'image/*', group: 'Photograph in occlusion' },
  { key: 'cbct_dicom', label: '6. CBCT (DICOM file) for implant cases', accept: '.dcm,.dicom,application/dicom' },
];

export interface TreatmentStep {
  step_number: number;
  what_is_done: string;
  why_it_is_done: string;
  clinical_procedure_details: string;
  investigations_and_materials: string;
  precautions: string[];
  common_errors_to_avoid: string[];
  pdf_references: string[];
}

export interface TreatmentPhase {
  phase_name: string;
  steps: TreatmentStep[];
}

export interface DiagnosisClassification {
  classification_system: string;
  specific_class: string;
  definitive_diagnosis: string;
  clinical_justification: string;
  differential_reasoning: string;
  pdf_references: string[];
}

export interface RehabilitationTechnique {
  technique_name: string;
  detailed_description: string;
  why_selected: string;
  why_not_alternatives: string;
  pdf_references: string[];
}

export interface OcclusalConcept {
  concept_name: string;
  clinical_application: string;
  pdf_references: string[];
}

export interface OcclusalScheme {
  scheme_name: string;
  justification: string;
  pdf_references: string[];
}

export interface PhotoAnalysisFinding {
  photo_label: string;
  observations: string;
  clinical_significance: string;
}

export interface MaterialChoice {
  material: string;
  where_used: string;
  rationale: string;
  pdf_references: string[];
}

export interface AlternativeOption {
  option: string;
  indications: string[];
  limitations: string[];
  when_to_choose: string;
  pdf_references: string[];
}

export interface PdfReference {
  source_title: string;
  excerpt_or_page: string;
  relevance: string;
}

export interface ExternalReference {
  source: string;
  summary: string;
  why_it_matters: string;
}

export interface ConflictOrUpdate {
  older_pdf_position: string;
  newer_understanding: string;
  clinical_impact: string;
}

export interface EvidenceBreakdown {
  pdf_references: PdfReference[];
  external_references: ExternalReference[];
  conflicts_or_updates: ConflictOrUpdate[];
}

export interface TreatmentResponse {
  case_summary: string;
  photo_analysis: PhotoAnalysisFinding[];
  need_more_information: string[];
  red_flags: string[];
  diagnosis: DiagnosisClassification;
  rehabilitation_technique: RehabilitationTechnique;
  occlusal_concept: OcclusalConcept;
  occlusal_scheme: OcclusalScheme;
  treatment_phases: TreatmentPhase[];
  alternative_options: AlternativeOption[];
  material_choices: MaterialChoice[];
  prosthodontic_considerations: string[];
  maintenance_protocol: string[];
  risks_and_complications: string[];
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
