import {
  AlertTriangle,
  HelpCircle,
  Target,
  ClipboardList,
  GitBranch,
  FlaskConical,
  Cog,
  Crosshair,
  Layers,
  Wrench,
  ShieldAlert,
  Users,
  BookOpen,
  Copy,
  CheckCircle,
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  Gem,
} from 'lucide-react';
import type { TreatmentResponse } from '../types';
import Accordion from './Accordion';
import { useState } from 'react';

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

function ConfidenceBadge({ level }: { level: string }) {
  const map: Record<string, string> = {
    high: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    low: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${map[level] ?? map.medium}`}
    >
      Confidence: {level}
    </span>
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
              <>
                <CheckCircle className="w-3.5 h-3.5 text-green-500" /> Copied
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copy JSON
              </>
            )}
          </button>
        </div>
      </div>

      {/* Case Summary */}
      <div className="bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          Case Summary
        </h2>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {data.case_summary || 'No summary generated.'}
        </p>
      </div>

      {/* Red Flags */}
      {data.red_flags.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800 p-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <h2 className="text-base font-bold text-red-800 dark:text-red-300">
              Red Flags — Urgent Attention Required
            </h2>
          </div>
          <ListItems items={data.red_flags} />
        </div>
      )}

      {/* Need More Information */}
      {data.need_more_information.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 p-6">
          <div className="flex items-center gap-2 mb-3">
            <HelpCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h2 className="text-base font-bold text-amber-800 dark:text-amber-300">
              Additional Information Needed
            </h2>
          </div>
          <ListItems items={data.need_more_information} />
        </div>
      )}

      {/* Working Assessment */}
      {data.working_assessment && (
        <div className="bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-2">
            Working Assessment
          </h2>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {data.working_assessment}
          </p>
        </div>
      )}

      {/* Treatment Objectives */}
      <Accordion
        title="Treatment Objectives"
        defaultOpen={true}
        badge={`${data.treatment_objectives.length}`}
      >
        <div className="flex items-start gap-2 mb-3">
          <Target className="w-4 h-4 text-primary-500 mt-0.5" />
          <span className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Goals</span>
        </div>
        <ListItems items={data.treatment_objectives} />
      </Accordion>

      {/* Recommended Treatment Plan */}
      <div className="bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-primary-200 dark:border-primary-800 p-6 space-y-5">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Recommended Treatment Plan
          </h2>
        </div>
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {data.recommended_treatment_plan.summary}
        </p>
        {data.recommended_treatment_plan.phases.map((phase, i) => (
          <div
            key={i}
            className="rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700 p-4 space-y-2"
          >
            <h3 className="text-sm font-bold text-primary-700 dark:text-primary-400">
              Phase {i + 1}: {phase.phase_name}
            </h3>
            <ul className="space-y-1">
              {phase.steps.map((s, j) => (
                <li
                  key={j}
                  className="text-sm text-slate-700 dark:text-slate-300 flex gap-2"
                >
                  <span className="text-primary-400 font-semibold select-none">
                    {j + 1}.
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500 dark:text-slate-400 italic mt-1">
              Rationale: {phase.rationale}
            </p>
          </div>
        ))}
      </div>

      {/* Alternative Options */}
      {data.alternative_options.length > 0 && (
        <Accordion
          title="Alternative Treatment Options"
          badge={`${data.alternative_options.length}`}
        >
          <div className="flex items-start gap-2 mb-3">
            <GitBranch className="w-4 h-4 text-slate-500 mt-0.5" />
          </div>
          <div className="space-y-4">
            {data.alternative_options.map((alt, i) => (
              <div
                key={i}
                className="rounded-xl bg-slate-50 dark:bg-slate-900/40 p-4 space-y-2 border border-slate-100 dark:border-slate-700"
              >
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {alt.option}
                </h4>
                {alt.indications.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Indications</p>
                    <ListItems items={alt.indications} />
                  </div>
                )}
                {alt.limitations.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Limitations</p>
                    <ListItems items={alt.limitations} />
                  </div>
                )}
                <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                  When to choose: {alt.when_to_choose}
                </p>
              </div>
            ))}
          </div>
        </Accordion>
      )}

      {/* Collapsible sections */}
      <Accordion title="Required Investigations" badge={`${data.required_investigations.length}`}>
        <div className="flex items-start gap-2 mb-3">
          <FlaskConical className="w-4 h-4 text-slate-500 mt-0.5" />
        </div>
        <ListItems items={data.required_investigations} />
      </Accordion>

      <Accordion
        title="Prosthodontic Considerations"
        badge={`${data.prosthodontic_considerations.length}`}
      >
        <div className="flex items-start gap-2 mb-3">
          <Cog className="w-4 h-4 text-slate-500 mt-0.5" />
        </div>
        <ListItems items={data.prosthodontic_considerations} />
      </Accordion>

      <Accordion
        title="Occlusion Considerations"
        badge={`${data.occlusion_considerations.length}`}
      >
        <div className="flex items-start gap-2 mb-3">
          <Crosshair className="w-4 h-4 text-slate-500 mt-0.5" />
        </div>
        <ListItems items={data.occlusion_considerations} />
      </Accordion>

      <Accordion title="Indications" defaultOpen={true} badge={`${data.indications.length}`}>
        <div className="flex items-start gap-2 mb-3">
          <ThumbsUp className="w-4 h-4 text-green-500 mt-0.5" />
        </div>
        <ListItems items={data.indications} />
      </Accordion>

      <Accordion title="Contraindications" badge={`${data.contraindications.length}`}>
        <div className="flex items-start gap-2 mb-3">
          <ThumbsDown className="w-4 h-4 text-red-500 mt-0.5" />
        </div>
        <ListItems items={data.contraindications} />
      </Accordion>

      <Accordion title="Choice of Material" defaultOpen={true} badge={`${data.choice_of_material.length}`}>
        <div className="flex items-start gap-2 mb-3">
          <Gem className="w-4 h-4 text-purple-500 mt-0.5" />
        </div>
        <ListItems items={data.choice_of_material} />
      </Accordion>

      <Accordion title="Material Options" badge={`${data.material_options.length}`}>
        <div className="flex items-start gap-2 mb-3">
          <Layers className="w-4 h-4 text-slate-500 mt-0.5" />
        </div>
        <ListItems items={data.material_options} />
      </Accordion>

      <Accordion title="Maintenance Protocol" badge={`${data.maintenance_protocol.length}`}>
        <div className="flex items-start gap-2 mb-3">
          <Wrench className="w-4 h-4 text-slate-500 mt-0.5" />
        </div>
        <ListItems items={data.maintenance_protocol} />
      </Accordion>

      <Accordion
        title="Risks & Contraindications"
        badge={`${data.risks_and_contraindications.length}`}
      >
        <div className="flex items-start gap-2 mb-3">
          <ShieldAlert className="w-4 h-4 text-red-500 mt-0.5" />
        </div>
        <ListItems items={data.risks_and_contraindications} />
      </Accordion>

      <Accordion
        title="Patient Communication Points"
        badge={`${data.patient_communication_points.length}`}
      >
        <div className="flex items-start gap-2 mb-3">
          <Users className="w-4 h-4 text-slate-500 mt-0.5" />
        </div>
        <ListItems items={data.patient_communication_points} />
      </Accordion>

      {/* Evidence Breakdown */}
      <div className="bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-5">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Evidence Breakdown
          </h2>
        </div>

        {/* PDF Memory */}
        {data.evidence_breakdown.pdf_memory.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide">
              From Uploaded PDFs
            </h3>
            <div className="space-y-3">
              {data.evidence_breakdown.pdf_memory.map((ref, i) => (
                <div
                  key={i}
                  className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4"
                >
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">
                    {ref.source_title}
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 italic">
                    "{ref.excerpt}"
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Relevance: {ref.relevance}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Latest Knowledge */}
        {data.evidence_breakdown.latest_knowledge.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wide">
              Current / Latest Knowledge
            </h3>
            <div className="space-y-3">
              {data.evidence_breakdown.latest_knowledge.map((ref, i) => (
                <div
                  key={i}
                  className="rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 p-4"
                >
                  <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">
                    {ref.topic}
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {ref.summary}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Why it matters: {ref.why_it_matters}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conflicts */}
        {data.evidence_breakdown.conflicts_or_updates.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-3 uppercase tracking-wide">
              Conflicts / Updates Between PDF & Current Knowledge
            </h3>
            <div className="space-y-3">
              {data.evidence_breakdown.conflicts_or_updates.map((c, i) => (
                <div
                  key={i}
                  className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 space-y-1"
                >
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    <span className="font-semibold text-amber-700 dark:text-amber-400">
                      Older (PDF):
                    </span>{' '}
                    {c.older_pdf_position}
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    <span className="font-semibold text-green-700 dark:text-green-400">
                      Newer understanding:
                    </span>{' '}
                    {c.newer_understanding}
                  </p>
                  <p className="text-xs text-slate-500">
                    Clinical impact: {c.clinical_impact}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.evidence_breakdown.pdf_memory.length === 0 &&
          data.evidence_breakdown.latest_knowledge.length === 0 && (
            <p className="text-sm text-slate-400 italic">No evidence breakdown available.</p>
          )}
      </div>

      {/* Disclaimer */}
      <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              Medical Disclaimer
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {data.disclaimer}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
