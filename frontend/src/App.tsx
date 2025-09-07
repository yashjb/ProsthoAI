import { useState, useEffect } from 'react';
import Header from './components/Header';
import CaseForm from './components/CaseForm';
import ResultsView from './components/ResultsView';
import LoadingState from './components/LoadingState';
import { analyzeCase } from './api';
import type { CaseInput, ClinicalPhotos, TreatmentResponse } from './types';

type View = 'form' | 'loading' | 'results';

export default function App() {
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [view, setView] = useState<View>('form');
  const [result, setResult] = useState<TreatmentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (caseData: CaseInput, photos: ClinicalPhotos) => {
    setView('loading');
    setSubmitting(true);
    setError(null);
    try {
      const res = await analyzeCase(caseData, photos);
      if (res.success && res.data) {
        setResult(res.data);
        setView('results');
      } else {
        setError(res.error || 'Unknown error from the server.');
        setView('form');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reach the server.');
      setView('form');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    setResult(null);
    setView('form');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header dark={dark} onToggle={() => setDark(!dark)} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero — only on form view */}
        {view === 'form' && (
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
              AI-Powered Prosthodontic <br className="hidden sm:block" />
              Treatment Planning
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              Enter the patient case details, upload clinical photographs, and
              receive an instant structured treatment plan grounded in evidence
              from reference PDFs and enhanced with current best knowledge.
            </p>
          </div>
        )}

        {/* Error toast */}
        {error && (
          <div className="mb-6 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300 shadow-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* CaseForm stays mounted to preserve state; hidden when not active */}
        <div style={{ display: view === 'form' ? 'block' : 'none' }}>
          <CaseForm onSubmit={handleSubmit} loading={submitting} />
        </div>
        {view === 'loading' && <LoadingState />}
        {view === 'results' && result && (
          <ResultsView data={result} onBack={handleBack} />
        )}
      </main>

      <footer className="text-center py-6 text-xs text-slate-400 dark:text-slate-500 border-t border-slate-200 dark:border-slate-800">
        ProsthoAI — Clinical Decision-Support Tool • Not a substitute for professional judgment
      </footer>
    </div>
  );
}
