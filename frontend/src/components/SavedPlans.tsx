import { useState } from 'react';
import { ArrowLeft, Trash2, ChevronDown, ChevronRight, Calendar, FileText } from 'lucide-react';
import type { SavedTreatmentPlan } from '../storage';
import { getSavedPlans, deletePlan } from '../storage';
import ResultsView from './ResultsView';

interface Props {
  onBack: () => void;
}

export default function SavedPlans({ onBack }: Props) {
  const [plans, setPlans] = useState<SavedTreatmentPlan[]>(getSavedPlans);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewingPlan, setViewingPlan] = useState<SavedTreatmentPlan | null>(null);

  const handleDelete = (id: string) => {
    deletePlan(id);
    setPlans(getSavedPlans());
    if (expandedId === id) setExpandedId(null);
  };

  if (viewingPlan) {
    return (
      <div>
        <button
          onClick={() => setViewingPlan(null)}
          className="inline-flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Saved Plans
        </button>

        {/* Show saved photos */}
        {Object.keys(viewingPlan.photoDataUrls).length > 0 && (
          <div className="mb-6 bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Uploaded Clinical Photos</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Object.entries(viewingPlan.photoDataUrls).map(([key, url]) => (
                <div key={key} className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                  <img src={url} alt={key} className="w-full h-24 object-cover" />
                  <p className="text-[10px] text-slate-500 text-center py-1 truncate px-1">{key.replace('photo_', '').replace(/_/g, ' ')}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Case Input Summary */}
        <div className="mb-6 bg-white dark:bg-slate-800/60 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Case Input</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(viewingPlan.caseInput)
              .filter(([, v]) => v && v.trim())
              .map(([key, value]) => (
                <div key={key} className="text-sm">
                  <span className="text-slate-500 dark:text-slate-400 capitalize">{key.replace(/_/g, ' ')}:</span>{' '}
                  <span className="text-slate-800 dark:text-slate-200">{value}</span>
                </div>
              ))}
          </div>
        </div>

        <ResultsView data={viewingPlan.treatmentResponse} onBack={() => setViewingPlan(null)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-500 dark:text-slate-400" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Saved Treatment Plans</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {plans.length} saved plan{plans.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {plans.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <FileText className="w-20 h-20 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 text-lg">No saved treatment plans yet</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
              Generate a treatment plan and click "Save Plan" to save it here
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white dark:bg-slate-800/60 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              <div className="flex items-center gap-3 p-4">
                <button
                  onClick={() => setExpandedId(expandedId === plan.id ? null : plan.id)}
                  className="flex-1 flex items-center gap-3 text-left"
                >
                  {expandedId === plan.id ? (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {plan.caseInput.chief_complaint || 'Untitled Case'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(plan.savedAt).toLocaleDateString()} at{' '}
                        {new Date(plan.savedAt).toLocaleTimeString()}
                      </span>
                      {plan.caseInput.patient_age && (
                        <span className="text-xs text-slate-400">
                          • Age: {plan.caseInput.patient_age}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => handleDelete(plan.id)}
                  className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors shrink-0"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {expandedId === plan.id && (
                <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700 pt-3">
                  <p className="text-sm text-slate-700 dark:text-slate-300 mb-3 line-clamp-3">
                    {plan.treatmentResponse.case_summary}
                  </p>
                  {plan.treatmentResponse.diagnosis?.definitive_diagnosis && (
                    <p className="text-xs text-slate-500 mb-3">
                      <span className="font-medium">Diagnosis:</span>{' '}
                      {plan.treatmentResponse.diagnosis.definitive_diagnosis}
                    </p>
                  )}
                  <button
                    onClick={() => setViewingPlan(plan)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium transition-colors"
                  >
                    View Full Plan
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
