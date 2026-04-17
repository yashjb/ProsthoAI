/**
 * PDF generation for Treatment Plans and Shade Matching results.
 * Uses jsPDF for client-side PDF creation.
 */
import jsPDF from 'jspdf';
import type { CaseInput, TreatmentResponse, ShadeAnalysis } from './types';

/* ── Helpers ─────────────────────────────────────────────────────────── */

const PAGE_W = 210; // A4 width mm
const PAGE_H = 297; // A4 height mm
const MARGIN = 15;
const CONTENT_W = PAGE_W - MARGIN * 2;
const LINE_H = 5.5; // line height in mm

function sanitize(text: string | undefined | null): string {
  return (text ?? '').trim();
}

function buildFilename(name: string, age: string, suffix: string): string {
  const n = sanitize(name) || 'Patient';
  const a = sanitize(age);
  const base = a ? `${n}_${a}` : n;
  // Clean filename
  return `${base.replace(/[^a-zA-Z0-9_ -]/g, '_')}_${suffix}.pdf`;
}

/** Ensure there is enough vertical space; add a new page if not. */
function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PAGE_H - MARGIN) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

/** Print a section heading and return the new Y. */
function heading(doc: jsPDF, y: number, text: string, level: 1 | 2 | 3 = 2): number {
  const sizes: Record<number, number> = { 1: 16, 2: 12, 3: 10 };
  const size = sizes[level];
  y = ensureSpace(doc, y, size + 4);
  if (level <= 2) {
    y += 3;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(size);
  doc.setTextColor(30, 58, 138); // primary blue
  doc.text(text, MARGIN, y);
  y += size * 0.4 + 2;
  if (level <= 2) {
    doc.setDrawColor(200, 210, 230);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
    y += 3;
  }
  return y;
}

/** Print normal body text (auto-wrapped) and return new Y. */
function bodyText(doc: jsPDF, y: number, text: string, indent = 0): number {
  if (!text) return y;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  const lines = doc.splitTextToSize(text, CONTENT_W - indent);
  for (const line of lines) {
    y = ensureSpace(doc, y, LINE_H);
    doc.text(line, MARGIN + indent, y);
    y += LINE_H;
  }
  return y;
}

/** Print a label: value pair. */
function labelValue(doc: jsPDF, y: number, label: string, value: string): number {
  if (!value) return y;
  y = ensureSpace(doc, y, LINE_H * 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(`${label}:`, MARGIN, y);
  const labelWidth = doc.getTextWidth(`${label}: `);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(50, 50, 50);
  const remaining = CONTENT_W - labelWidth;
  const lines = doc.splitTextToSize(value, remaining);
  doc.text(lines[0], MARGIN + labelWidth, y);
  y += LINE_H;
  for (let i = 1; i < lines.length; i++) {
    y = ensureSpace(doc, y, LINE_H);
    doc.text(lines[i], MARGIN + labelWidth, y);
    y += LINE_H;
  }
  return y;
}

/** Print a label: value pair where label may be very long.
 *  Places the value on a new line with indent instead of inline. */
function labelValueBlock(doc: jsPDF, y: number, label: string, value: string): number {
  if (!value) return y;
  y = ensureSpace(doc, y, LINE_H * 3);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  const labelLines = doc.splitTextToSize(`${label}:`, CONTENT_W);
  for (const line of labelLines) {
    y = ensureSpace(doc, y, LINE_H);
    doc.text(line, MARGIN, y);
    y += LINE_H;
  }
  y = bodyText(doc, y, value, 10);
  return y;
}

/** Print a bullet list. */
function bulletList(doc: jsPDF, y: number, items: string[]): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(50, 50, 50);
  for (const item of items) {
    const lines = doc.splitTextToSize(`• ${item}`, CONTENT_W - 4);
    for (let i = 0; i < lines.length; i++) {
      y = ensureSpace(doc, y, LINE_H);
      doc.text(lines[i], MARGIN + 4, y);
      y += LINE_H;
    }
  }
  return y;
}

/** Add an image from a data URL and return new Y. */
async function addImage(
  doc: jsPDF,
  y: number,
  dataUrl: string,
  caption: string,
  maxW = 80,
  maxH = 60,
): Promise<number> {
  try {
    y = ensureSpace(doc, y, maxH + 12);
    // jsPDF expects base64 or data URL
    doc.addImage(dataUrl, 'JPEG', MARGIN, y, maxW, maxH);
    y += maxH + 2;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.text(caption, MARGIN, y);
    y += LINE_H + 2;
  } catch {
    // Skip images that fail to load
  }
  return y;
}

/* ── Treatment Plan PDF ──────────────────────────────────────────────── */

export async function generateTreatmentPlanPDF(
  caseInput: CaseInput,
  photoDataUrls: Record<string, string>,
  data: TreatmentResponse,
): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'a4');
  let y = MARGIN;

  // ── Title page ───
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(30, 58, 138);
  y += 10;
  doc.text('Prosthodontic Treatment Plan', MARGIN, y);
  y += 10;
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
  y += 8;

  // Patient info
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'normal');

  const patientName = sanitize(caseInput.patient_name) || 'N/A';
  const patientAge = sanitize(caseInput.patient_age) || 'N/A';
  const patientSex = sanitize(caseInput.patient_sex) || 'N/A';

  y = labelValue(doc, y, 'Patient Name', patientName);
  y = labelValue(doc, y, 'Age', patientAge);
  y = labelValue(doc, y, 'Sex', patientSex);
  y = labelValue(doc, y, 'Date', new Date().toLocaleDateString());
  y += 4;

  // ── Case Summary ───
  y = heading(doc, y, 'Case Summary', 1);
  y = bodyText(doc, y, data.case_summary || 'No summary generated.');
  y += 3;

  // ── Patient Demographics & History ───
  y = heading(doc, y, 'Patient Demographics & History');
  const demoFields: [string, string][] = [
    ['Chief Complaint', caseInput.chief_complaint],
    ['Medical History', caseInput.medical_history],
    ['Dental History', caseInput.dental_history],
    ['Extraoral Findings', caseInput.extraoral_findings],
    ['Intraoral Findings', caseInput.intraoral_findings],
    ['Periodontal Findings', caseInput.periodontal_findings],
    ['Endodontic Status', caseInput.endodontic_status],
    ['Existing Prosthesis Status', caseInput.existing_prosthesis_status],
    ['Missing Teeth', caseInput.missing_teeth],
    ['Occlusion Notes', caseInput.occlusion_notes],
    ['Esthetic Concerns', caseInput.esthetic_concerns],
    ['Functional Concerns', caseInput.functional_concerns],
    ['Radiographic Findings', caseInput.radiographic_findings],
    ['Proposed Treatment', caseInput.proposed_treatment],
    ['Budget Sensitivity', caseInput.budget_sensitivity],
    ['Time Constraints', caseInput.time_constraints],
    ['Patient Expectations', caseInput.patient_expectations],
    ['Additional Notes', caseInput.additional_notes],
  ];
  for (const [label, val] of demoFields) {
    if (sanitize(val)) {
      y = labelValue(doc, y, label, val);
    }
  }
  y += 3;

  // ── Clinical Photographs ───
  const photoEntries = Object.entries(photoDataUrls);
  if (photoEntries.length > 0) {
    y = heading(doc, y, 'Clinical Photographs');
    for (const [key, url] of photoEntries) {
      const caption = key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      y = await addImage(doc, y, url, caption);
    }
    y += 3;
  }

  // ── Red Flags ───
  if (data.red_flags?.length > 0) {
    y = heading(doc, y, 'Red Flags — Urgent Attention Required');
    y = bulletList(doc, y, data.red_flags);
    y += 3;
  }

  // ── Need More Information ───
  if (data.need_more_information?.length > 0) {
    y = heading(doc, y, 'Additional Information Needed');
    y = bulletList(doc, y, data.need_more_information);
    y += 3;
  }

  // ── Photo Analysis ───
  if (data.photo_analysis?.length > 0) {
    y = heading(doc, y, 'Clinical Photograph Analysis');
    for (const p of data.photo_analysis) {
      y = ensureSpace(doc, y, 20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(p.photo_label, MARGIN, y);
      y += LINE_H;
      y = bodyText(doc, y, p.observations, 4);
      y = bodyText(doc, y, `Significance: ${p.clinical_significance}`, 4);
      y += 2;
    }
  }

  // ── Diagnosis ───
  if (data.diagnosis) {
    y = heading(doc, y, 'Diagnosis');
    y = labelValue(doc, y, 'Classification System', data.diagnosis.classification_system);
    y = labelValue(doc, y, 'Specific Class', data.diagnosis.specific_class);
    y = labelValue(doc, y, 'Definitive Diagnosis', data.diagnosis.definitive_diagnosis);
    y = labelValue(doc, y, 'Clinical Justification', data.diagnosis.clinical_justification);
    y = labelValue(doc, y, 'Differential Reasoning', data.diagnosis.differential_reasoning);
    y += 3;
  }

  // ── Rehabilitation Technique ───
  if (data.rehabilitation_technique?.technique_name) {
    y = heading(doc, y, 'Rehabilitation Technique');
    y = labelValue(doc, y, 'Technique', data.rehabilitation_technique.technique_name);
    y = bodyText(doc, y, data.rehabilitation_technique.detailed_description);
    y = labelValue(doc, y, 'Why Selected', data.rehabilitation_technique.why_selected);
    y = labelValue(doc, y, 'Why Not Alternatives', data.rehabilitation_technique.why_not_alternatives);
    y += 3;
  }

  // ── Occlusal Concept & Scheme ───
  if (data.occlusal_concept?.concept_name) {
    y = heading(doc, y, 'Occlusal Concept');
    y = labelValue(doc, y, 'Concept', data.occlusal_concept.concept_name);
    y = bodyText(doc, y, data.occlusal_concept.clinical_application);
    y += 2;
  }
  if (data.occlusal_scheme?.scheme_name) {
    y = heading(doc, y, 'Occlusal Scheme');
    y = labelValue(doc, y, 'Scheme', data.occlusal_scheme.scheme_name);
    y = bodyText(doc, y, data.occlusal_scheme.justification);
    y += 2;
  }

  // ── Treatment Phases ───
  if (data.treatment_phases?.length > 0) {
    y = heading(doc, y, 'Step-by-Step Treatment Plan', 1);
    for (const phase of data.treatment_phases) {
      y = heading(doc, y, phase.phase_name, 2);
      for (const step of phase.steps) {
        y = ensureSpace(doc, y, 18);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30, 58, 138);
        doc.text(`Step ${step.step_number}: ${step.what_is_done}`, MARGIN + 2, y);
        y += LINE_H;

        if (step.why_it_is_done) {
          y = labelValue(doc, y, 'Why', step.why_it_is_done);
        }
        if (step.clinical_procedure_details) {
          y = labelValue(doc, y, 'Clinical Procedure', step.clinical_procedure_details);
        }
        if (step.investigations_and_materials) {
          y = labelValue(doc, y, 'Investigations & Materials', step.investigations_and_materials);
        }
        if (step.precautions?.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(180, 120, 0);
          y = ensureSpace(doc, y, LINE_H);
          doc.text('Precautions:', MARGIN + 4, y);
          y += LINE_H;
          y = bulletList(doc, y, step.precautions);
        }
        if (step.common_errors_to_avoid?.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(200, 50, 50);
          y = ensureSpace(doc, y, LINE_H);
          doc.text('Common Errors to Avoid:', MARGIN + 4, y);
          y += LINE_H;
          y = bulletList(doc, y, step.common_errors_to_avoid);
        }
        y += 2;
      }
    }
  }

  // ── Alternative Options ───
  if (data.alternative_options?.length > 0) {
    y = heading(doc, y, 'Alternative Treatment Options');
    for (const alt of data.alternative_options) {
      y = ensureSpace(doc, y, 12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);
      doc.text(alt.option, MARGIN, y);
      y += LINE_H;
      if (alt.indications?.length) {
        y = labelValue(doc, y, 'Indications', alt.indications.join('; '));
      }
      if (alt.limitations?.length) {
        y = labelValue(doc, y, 'Limitations', alt.limitations.join('; '));
      }
      y = labelValue(doc, y, 'When to Choose', alt.when_to_choose);
      y += 2;
    }
  }

  // ── Material Choices ───
  if (data.material_choices?.length > 0) {
    y = heading(doc, y, 'Material Choices');
    for (const m of data.material_choices) {
      y = ensureSpace(doc, y, 12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(50, 50, 50);
      doc.text(m.material, MARGIN, y);
      y += LINE_H;
      y = labelValue(doc, y, 'Where Used', m.where_used);
      y = labelValue(doc, y, 'Rationale', m.rationale);
      y += 2;
    }
  }

  // ── Prosthodontic Considerations ───
  if (data.prosthodontic_considerations?.length > 0) {
    y = heading(doc, y, 'Prosthodontic Considerations');
    y = bulletList(doc, y, data.prosthodontic_considerations);
    y += 3;
  }

  // ── Maintenance Protocol ───
  if (data.maintenance_protocol?.length > 0) {
    y = heading(doc, y, 'Maintenance Protocol');
    y = bulletList(doc, y, data.maintenance_protocol);
    y += 3;
  }

  // ── Risks & Complications ───
  if (data.risks_and_complications?.length > 0) {
    y = heading(doc, y, 'Risks & Complications');
    y = bulletList(doc, y, data.risks_and_complications);
    y += 3;
  }

  // ── Patient Communication Points ───
  if (data.patient_communication_points?.length > 0) {
    y = heading(doc, y, 'Patient Communication Points');
    y = bulletList(doc, y, data.patient_communication_points);
    y += 3;
  }

  // ── Evidence Breakdown ───
  if (data.evidence_breakdown?.pdf_references?.length > 0 || data.evidence_breakdown?.external_references?.length > 0) {
    y = heading(doc, y, 'Evidence Breakdown');
    if (data.evidence_breakdown.pdf_references?.length > 0) {
      y = heading(doc, y, 'PDF References', 3);
      for (const ref of data.evidence_breakdown.pdf_references) {
        y = labelValueBlock(doc, y, ref.source_title, `"${ref.excerpt_or_page}" — ${ref.relevance}`);
        y += 1;
      }
      y += 2;
    }
    if (data.evidence_breakdown.external_references?.length > 0) {
      y = heading(doc, y, 'External Evidence', 3);
      for (const ref of data.evidence_breakdown.external_references) {
        y = labelValueBlock(doc, y, ref.source, `${ref.summary} — ${ref.why_it_matters}`);
        y += 1;
      }
      y += 2;
    }
  }

  // ── Confidence & Disclaimer ───
  y = ensureSpace(doc, y, 20);
  y += 3;
  y = labelValue(doc, y, 'Confidence Level', data.confidence_level);
  y += 3;
  y = heading(doc, y, 'Medical Disclaimer', 3);
  y = bodyText(doc, y, data.disclaimer);

  // ── Footer on every page ───
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Prosthodontic Intelligence — ${patientName} — Page ${i} of ${totalPages}`,
      PAGE_W / 2,
      PAGE_H - 8,
      { align: 'center' },
    );
  }

  // Save
  const filename = buildFilename(caseInput.patient_name, caseInput.patient_age, 'Treatment_Plan');
  doc.save(filename);
}

/* ── Shade Matching PDF ──────────────────────────────────────────────── */

export async function generateShadeMatchingPDF(
  imageDataUrl: string,
  filename: string,
  analysis: ShadeAnalysis,
  patientName?: string,
  patientAge?: string,
): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'a4');
  let y = MARGIN;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(30, 58, 138);
  y += 10;
  doc.text('Shade Matching Analysis', MARGIN, y);
  y += 10;
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
  y += 8;

  y = labelValue(doc, y, 'Date', new Date().toLocaleDateString());
  y = labelValue(doc, y, 'Image', filename);
  y += 4;

  // Image
  try {
    y = await addImage(doc, y, imageDataUrl, filename, 120, 90);
  } catch { /* skip */ }
  y += 3;

  // Analysis
  y = heading(doc, y, 'Shade Analysis Results');

  if (analysis.raw_analysis) {
    y = bodyText(doc, y, analysis.raw_analysis);
  } else {
    if (analysis.primary_shade) {
      y = labelValue(doc, y, 'Primary Shade', analysis.primary_shade);
    }
    if (analysis.shade_family) {
      y = labelValue(doc, y, 'Shade Family', analysis.shade_family);
    }
    if (analysis.value) {
      y = labelValue(doc, y, 'Brightness (Value)', analysis.value);
    }
    if (analysis.chroma) {
      y = labelValue(doc, y, 'Color Intensity (Chroma)', analysis.chroma);
    }
    if (analysis.hue) {
      y = labelValue(doc, y, 'Color Tone (Hue)', analysis.hue);
    }
    if (analysis.confidence) {
      y = labelValue(doc, y, 'Confidence', analysis.confidence);
    }
    if (analysis.recommended_shades && analysis.recommended_shades.length > 0) {
      y += 2;
      y = heading(doc, y, 'Alternative Shade Options', 3);
      y = bulletList(doc, y, analysis.recommended_shades);
    }
    if (analysis.notes) {
      y += 2;
      y = heading(doc, y, 'Notes', 3);
      y = bodyText(doc, y, analysis.notes);
    }
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Prosthodontic Intelligence — Shade Analysis — Page ${i} of ${totalPages}`,
      PAGE_W / 2,
      PAGE_H - 8,
      { align: 'center' },
    );
  }

  const pdfName = buildFilename(patientName ?? '', patientAge ?? '', 'Shade_Analysis');
  doc.save(pdfName);
}
