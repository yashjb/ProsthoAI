import {
  AlertTriangle,
  HelpCircle,
  ClipboardList,
  GitBranch,
  Cog,
  Wrench,
  ShieldAlert,
  Users,
  BookOpen,
  Copy,
  CheckCircle,
  ArrowLeft,
  Gem,
  Camera,
  Stethoscope,
  Layers,
  Crosshair,
  Target,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type { TreatmentResponse, TreatmentStep } from '../types';
import Accordion from './Accordion';
// Renders the full AI treatment plan in collapsible sections
import { useState } from 'react';
// Clipboard copy state tracked per-section for visual feedback

interface Props {
  data: TreatmentResponse;
  onBack: () => void;
}

function ListItems({ items }: { items: string[] }) {
  if (!items.length) return <p className="text-sm text-slate-400 italic">None identified.</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex gap-2">
          <span className="text-slate-400 select-none">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function RefTags({ refs }: { refs: string[] }) {
  if (!refs.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {refs.map((r, i) => (
        <span key={i} className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
          {r}
        </span>
      ))}
    </div>
  );
}

function ConfidenceBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    high: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800',
    low: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800',
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${map[level] ?? map.medium}`}>
      Confidence: {level}
    </span>
  );
}

function StepCard({ step }: { step: TreatmentStep }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700 p-4 space-y-2 hover:border-primary-200 dark:hover:border-primary-800 transition-colors">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-2 text-left"
      >
        <span className="text-primary-500 font-bold text-sm select-none mt-0.5">
          {step.step_number}.
        </span>
        <span className="flex-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
          {step.what_is_done}
        </span>
        {open ? <ChevronDown className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />}
      </button>

      {open && (
        <div className="pl-6 space-y-3 mt-2">
          {step.why_it_is_done && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">Why</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{step.why_it_is_done}</p>
            </div>
          )}
          {step.clinical_procedure_details && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">Clinical Procedure</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">{step.clinical_procedure_details}</p>
            </div>
          )}
          {step.investigations_and_materials && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">Investigations & Materials</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{step.investigations_and_materials}</p>
            </div>
          )}
          {step.precautions.length > 0 && (
            <div>
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-0.5">Precautions</p>
              <ListItems items={step.precautions} />
            </div>
          )}
          {step.common_errors_to_avoid.length > 0 && (
            <div>
              <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide mb-0.5">Common Errors to Avoid</p>
              <ListItems items={step.common_errors_to_avoid} />
            </div>
          )}
          <RefTags refs={step.pdf_references} />
        </div>
      )}
    </div>
  );
}

export default function ResultsView({ data, onBack }: Props) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> New Case
        </button>
        <div className="flex items-center gap-3">
          <ConfidenceBadge level={data.confidence_level} />
          <button
            onClick={copyToClipboard}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {copied ? (
              <><CheckCircle className="w-3.5 h-3.5 text-green-500" /> Copied</>
            ) : (
              <><Copy className="w-3.5 h-3.5" /> Copy JSON</>
            )}
          </button>
        </div>
      </div>

      {/* Case Summary */}
      <div className="bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Case Summary</h2>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {data.case_summary || 'No summary generated.'}
        </p>
      </div>

      {/* Red Flags */}
      {data.red_flags?.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800 p-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <h2 className="text-base font-bold text-red-800 dark:text-red-300">Red Flags — Urgent Attention Required</h2>
          </div>
          <ListItems items={data.red_flags} />
        </div>
      )}

      {/* Need More Information */}
      {data.need_more_information?.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 p-6">
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h2 className="text-base font-bold text-amber-800 dark:text-amber-300">Additional Information Needed</h2>
          </div>
          <ListItems items={data.need_more_information} />
        </div>
      )}

      {/* Photo Analysis */}
      {data.photo_analysis?.length > 0 && (
        <Accordion title="Clinical Photograph Analysis" defaultOpen={true} badge={`${data.photo_analysis.length}`}>
          <div className="flex items-start gap-2 mb-3">
            <Camera className="w-4 h-4 text-primary-500 mt-0.5" />
            <span className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Visual Findings</span>
          </div>
          <div className="space-y-4">
            {data.photo_analysis.map((p, i) => (
              <div key={i} className="rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700 p-4 space-y-2">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{p.photo_label}</h4>
                <p className="text-sm text-slate-700 dark:text-slate-300">{p.observations}</p>
                <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">Significance: {p.clinical_significance}</p>
              </div>
            ))}
          </div>
        </Accordion>
      )}

      {/* Diagnosis */}
      {data.diagnosis && (
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-primary-200 dark:border-primary-800 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Diagnosis</h2>
          </div>
          {data.diagnosis.classification_system && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">Classification System</p>
              <p className="text-sm text-slate-700 dark:text-slate-300">{data.diagnosis.classification_system}</p>
            </div>
          )}
          {data.diagnosis.specific_class && (
            <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-4 border border-primary-100 dark:border-primary-800">
              <p className="text-sm font-bold text-primary-800 dark:text-primary-300">{data.diagnosis.specific_class}</p>
            </div>
          )}
          {data.diagnosis.definitive_diagnosis && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">Definitive Diagnosis</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{data.diagnosis.definitive_diagnosis}</p>
            </div>
          )}
          {data.diagnosis.clinical_justification && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">Clinical Justification</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{data.diagnosis.clinical_justification}</p>
            </div>
          )}
          {data.diagnosis.differential_reasoning && (
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">Differential Reasoning</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{data.diagnosis.differential_reasoning}</p>
            </div>
          )}
          <RefTags refs={data.diagnosis.pdf_references} />
        </div>
      )}

      {/* Rehabilitation Technique */}
      {data.rehabilitation_technique?.technique_name && (
        <Accordion title="Rehabilitation Technique" defaultOpen={true}>
          <div className="space-y-3">
            <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-4 border border-primary-100 dark:border-primary-800">
              <p className="text-sm font-bold text-primary-800 dark:text-primary-300">{data.rehabilitation_technique.technique_name}</p>
            </div>
            {data.rehabilitation_technique.detailed_description && (
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-0.5">Description</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{data.rehabilitation_technique.detailed_description}</p>
              </div>
            )}
            {data.rehabilitation_technique.why_selected && (
              <div>
                <p className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide mb-0.5">Why Selected</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{data.rehabilitation_technique.why_selected}</p>
              </div>
            )}
            {data.rehabilitation_technique.why_not_alternatives && (
              <div>
                <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide mb-0.5">Why Not Alternatives</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{data.rehabilitation_technique.why_not_alternatives}</p>
              </div>
            )}
            <RefTags refs={data.rehabilitation_technique.pdf_references} />
          </div>
        </Accordion>
      )}

      {/* Occlusal Concept & Scheme */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.occlusal_concept?.concept_name && (
          <div className="bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 space-y-2">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-primary-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Occlusal Concept</h3>
            </div>
            <p className="text-sm font-semibold text-primary-700 dark:text-primary-400">{data.occlusal_concept.concept_name}</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{data.occlusal_concept.clinical_application}</p>
            <RefTags refs={data.occlusal_concept.pdf_references} />
          </div>
        )}
        {data.occlusal_scheme?.scheme_name && (
          <div className="bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 space-y-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Occlusal Scheme</h3>
            </div>
            <p className="text-sm font-semibold text-primary-700 dark:text-primary-400">{data.occlusal_scheme.scheme_name}</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{data.occlusal_scheme.justification}</p>
            <RefTags refs={data.occlusal_scheme.pdf_references} />
          </div>
        )}
      </div>

      {/* Treatment Phases */}
      {data.treatment_phases?.length > 0 && (
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-primary-200 dark:border-primary-800 p-6 space-y-5">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Step-by-Step Treatment Plan</h2>
          </div>
          {data.treatment_phases.map((phase, i) => (
            <div key={i} className="space-y-3">
              <h3 className="text-sm font-bold text-primary-700 dark:text-primary-400 border-b border-primary-100 dark:border-primary-800 pb-1">
                {phase.phase_name}
              </h3>
              <div className="space-y-2">
                {phase.steps.map((step, j) => (
                  <StepCard key={j} step={step} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alternative Options */}
      {data.alternative_options?.length > 0 && (
        <Accordion title="Alternative Treatment Options" badge={`${data.alternative_options.length}`}>
          <div className="flex items-start gap-2 mb-3">
            <GitBranch className="w-4 h-4 text-slate-500 mt-0.5" />
          </div>
          <div className="space-y-4">
            {data.alternative_options.map((alt, i) => (
              <div key={i} className="rounded-xl bg-slate-50 dark:bg-slate-900/40 p-4 space-y-2 border border-slate-100 dark:border-slate-700">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{alt.option}</h4>
                {alt.indications?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Indications</p>
                    <ListItems items={alt.indications} />
                  </div>
                )}
                {alt.limitations?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Limitations</p>
                    <ListItems items={alt.limitations} />
                  </div>
                )}
                <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                  When to choose: {alt.when_to_choose}
                </p>
                <RefTags refs={alt.pdf_references} />
              </div>
            ))}
          </div>
        </Accordion>
      )}

      {/* Material Choices */}
      {data.material_choices?.length > 0 && (
        <Accordion title="Material Choices" defaultOpen={true} badge={`${data.material_choices.length}`}>
          <div className="flex items-start gap-2 mb-3">
            <Gem className="w-4 h-4 text-purple-500 mt-0.5" />
          </div>
          <div className="space-y-3">
            {data.material_choices.map((m, i) => (
              <div key={i} className="rounded-xl bg-slate-50 dark:bg-slate-900/40 p-4 space-y-1 border border-slate-100 dark:border-slate-700">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{m.material}</h4>
                <p className="text-xs text-slate-500">Where: {m.where_used}</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{m.rationale}</p>
                <RefTags refs={m.pdf_references} />
              </div>
            ))}
          </div>
        </Accordion>
      )}

      {/* Prosthodontic Considerations */}
      <Accordion title="Prosthodontic Considerations" badge={`${data.prosthodontic_considerations?.length ?? 0}`}>
        <div className="flex items-start gap-2 mb-3">
          <Cog className="w-4 h-4 text-slate-500 mt-0.5" />
        </div>
        <ListItems items={data.prosthodontic_considerations ?? []} />
      </Accordion>

      {/* Maintenance Protocol */}
      <Accordion title="Maintenance Protocol" badge={`${data.maintenance_protocol?.length ?? 0}`}>
        <div className="flex items-start gap-2 mb-3">
          <Wrench className="w-4 h-4 text-slate-500 mt-0.5" />
        </div>
        <ListItems items={data.maintenance_protocol ?? []} />
      </Accordion>

      {/* Risks & Complications */}
      <Accordion title="Risks & Complications" badge={`${data.risks_and_complications?.length ?? 0}`}>
        <div className="flex items-start gap-2 mb-3">
          <ShieldAlert className="w-4 h-4 text-red-500 mt-0.5" />
        </div>
        <ListItems items={data.risks_and_complications ?? []} />
      </Accordion>

      {/* Patient Communication Points */}
      <Accordion title="Patient Communication Points" badge={`${data.patient_communication_points?.length ?? 0}`}>
        <div className="flex items-start gap-2 mb-3">
          <Users className="w-4 h-4 text-slate-500 mt-0.5" />
        </div>
        <ListItems items={data.patient_communication_points ?? []} />
      </Accordion>

      {/* Evidence Breakdown */}
      <div className="bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-5">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Evidence Breakdown</h2>
        </div>

        {/* PDF References */}
        {data.evidence_breakdown?.pdf_references?.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide">From PDFs</h3>
            <div className="space-y-3">
              {data.evidence_breakdown.pdf_references.map((ref, i) => (
                <div key={i} className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">{ref.source_title}</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 italic">"{ref.excerpt_or_page}"</p>
                  <p className="text-xs text-slate-500 mt-1">Relevance: {ref.relevance}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* External References */}
        {data.evidence_breakdown?.external_references?.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide">External Evidence</h3>
            <div className="space-y-3">
              {data.evidence_breakdown.external_references.map((ref, i) => (
                <div key={i} className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 p-4">
                  <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">{ref.source}</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{ref.summary}</p>
                  <p className="text-xs text-slate-500 mt-1">Why it matters: {ref.why_it_matters}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!data.evidence_breakdown?.pdf_references?.length &&
          !data.evidence_breakdown?.external_references?.length && (
            <p className="text-sm text-slate-400 italic">No evidence breakdown available.</p>
          )}
      </div>

      {/* Disclaimer */}
      <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Medical Disclaimer</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{data.disclaimer}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
