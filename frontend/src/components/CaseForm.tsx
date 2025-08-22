import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import type { CaseInput, ClinicalPhotos } from '../types';
import { emptyCaseInput } from '../types';
import ClinicalPhotosUpload from './ClinicalPhotosUpload';

interface Props {
  onSubmit: (caseData: CaseInput, photos: ClinicalPhotos) => void;
  loading: boolean;
}

interface FieldDef {
  key: keyof CaseInput;
  label: string;
  placeholder: string;
  rows?: number;
}

const SECTIONS: { title: string; fields: FieldDef[] }[] = [
  {
    title: 'Patient Demographics',
    fields: [
      { key: 'patient_age', label: 'Patient Age', placeholder: 'e.g. 55 years' },
      { key: 'patient_sex', label: 'Patient Sex', placeholder: 'e.g. Male / Female / Other' },
    ],
  },
  {
    title: 'Presenting Complaint',
    fields: [
      {
        key: 'chief_complaint',
        label: 'Chief Complaint',
        placeholder: 'Primary reason for visit…',
        rows: 2,
      },
    ],
  },
  {
    title: 'Medical & Dental History',
    fields: [
      {
        key: 'medical_history',
        label: 'Medical History',
        placeholder: 'Systemic conditions, medications, allergies…',
        rows: 3,
      },
      {
        key: 'dental_history',
        label: 'Dental History',
        placeholder: 'Past treatments, trauma, relevant dental history…',
        rows: 2,
      },
    ],
  },
  {
    title: 'Clinical Findings',
    fields: [
      {
        key: 'extraoral_findings',
        label: 'Extraoral Findings',
        placeholder: 'Facial asymmetry, TMJ, lymph nodes…',
        rows: 2,
      },
      {
        key: 'intraoral_findings',
        label: 'Intraoral Findings',
        placeholder: 'Soft tissue, hard tissue, dentition status…',
        rows: 3,
      },
      {
        key: 'periodontal_findings',
        label: 'Periodontal Findings',
        placeholder: 'Pocket depths, mobility, furcation involvement…',
        rows: 2,
      },
      {
        key: 'endodontic_status',
        label: 'Endodontic Status',
        placeholder: 'Root canal treated teeth, periapical status…',
      },
    ],
  },
  {
    title: 'Prosthesis & Occlusion',
    fields: [
      {
        key: 'existing_prosthesis_status',
        label: 'Existing Prosthesis Status',
        placeholder: 'Current prostheses, fit, condition…',
        rows: 2,
      },
      {
        key: 'missing_teeth',
        label: 'Missing / Abutment Teeth',
        placeholder: 'Use FDI notation, e.g. 16, 26, 36, 46 missing…',
        rows: 2,
      },
      {
        key: 'occlusion_notes',
        label: 'Occlusion Notes',
        placeholder: 'Classification, interferences, VDO…',
        rows: 2,
      },
    ],
  },
  {
    title: 'Patient Concerns',
    fields: [
      {
        key: 'esthetic_concerns',
        label: 'Esthetic Concerns',
        placeholder: 'Smile line, tooth shade, gingival display…',
      },
      {
        key: 'functional_concerns',
        label: 'Functional Concerns',
        placeholder: 'Chewing difficulty, speech issues…',
      },
    ],
  },
  {
    title: 'Diagnostic Information',
    fields: [
      {
        key: 'radiographic_findings',
        label: 'Radiographic Findings',
        placeholder: 'OPG, CBCT, periapical findings…',
        rows: 3,
      },
      {
        key: 'provisional_diagnosis',
        label: 'Provisional Diagnosis',
        placeholder: 'Working diagnosis…',
        rows: 2,
      },
      {
        key: 'proposed_treatment',
        label: 'Proposed Treatment by Clinician',
        placeholder: 'Your initial treatment idea…',
        rows: 2,
      },
    ],
  },
  {
    title: 'Constraints & Expectations',
    fields: [
      {
        key: 'budget_sensitivity',
        label: 'Budget Sensitivity',
        placeholder: 'e.g. High / Moderate / Low',
      },
      {
        key: 'time_constraints',
        label: 'Time Constraints',
        placeholder: 'e.g. Needs completion before wedding in 3 months',
      },
      {
        key: 'patient_expectations',
        label: 'Patient Expectations',
        placeholder: 'What the patient wants/expects…',
        rows: 2,
      },
    ],
  },
  {
    title: 'Additional Notes',
    fields: [
      {
        key: 'additional_notes',
        label: 'Additional Notes',
        placeholder: 'Anything else relevant to the case…',
        rows: 3,
      },
    ],
  },
];

export default function CaseForm({ onSubmit, loading }: Props) {
  const [form, setForm] = useState<CaseInput>(emptyCaseInput);
  const [photos, setPhotos] = useState<ClinicalPhotos>({});

  const set = (key: keyof CaseInput, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form, photos);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Clinical Photographs & Imaging */}
      <div className="bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <ClinicalPhotosUpload photos={photos} onChange={setPhotos} />
      </div>

      {/* Case Sections */}
      {SECTIONS.map((section) => (
        <div
          key={section.title}
          className="bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-5"
        >
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700 pb-3">
            {section.title}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {section.fields.map((f) => (
              <div
                key={f.key}
                className={f.rows && f.rows >= 3 ? 'md:col-span-2' : ''}
              >
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                  {f.label}
                </label>
                {f.rows ? (
                  <textarea
                    rows={f.rows}
                    value={form[f.key]}
                    onChange={(e) => set(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-400 transition-all resize-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={form[f.key]}
                    onChange={(e) => set(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 px-4 py-2.5 text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-400 transition-all"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-lg shadow-primary-500/25 disabled:opacity-60 disabled:cursor-not-allowed transition-all hover:shadow-xl hover:shadow-primary-500/30"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing Case…
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Generate Treatment Plan
            </>
          )}
        </button>
      </div>
    </form>
  );
}
