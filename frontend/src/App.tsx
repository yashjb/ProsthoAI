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

  const handleSubmit = async (caseData: CaseInput, files: File[], photos: ClinicalPhotos) => {
    setView('loading');
    setError(null);
    try {
      const res = await analyzeCase(caseData, files, photos);
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
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              AI-Powered Prosthodontic <br className="hidden sm:block" />
              Treatment Planning
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              Upload your reference PDFs, enter the patient case details, and receive
              an instant structured treatment plan grounded in evidence and enhanced
              with current best knowledge.
            </p>
          </div>
        )}

        {/* Error toast */}
        {error && (
          <div className="mb-6 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300">
            <strong>Error:</strong> {error}
          </div>
        )}

        {view === 'form' && (
          <CaseForm onSubmit={handleSubmit} loading={false} />
        )}
        {view === 'loading' && <LoadingState />}
        {view === 'results' && result && (
          <ResultsView data={result} onBack={handleBack} />
        )}
      </main>

      <footer className="text-center py-6 text-xs text-slate-400 dark:text-slate-500">
        ProsthoAI — Clinical Decision-Support Tool • Not a substitute for professional judgment
      </footer>
    </div>
  );
}
