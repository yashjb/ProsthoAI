import { useEffect } from 'react';
import { Brain, FileSearch, Stethoscope } from 'lucide-react';
import { useSimulatedProgress } from '../hooks/useSimulatedProgress';

const steps = [
  { icon: FileSearch, text: 'Extracting reference material…', threshold: 15 },
  { icon: Brain, text: 'Analyzing clinical data…', threshold: 45 },
  { icon: Stethoscope, text: 'Generating treatment plan…', threshold: 75 },
];

interface Props {
  /** Signal that the API call has finished. Progress will jump to 100% and call onDone. */
  finished?: boolean;
  /** Called after 100% is briefly shown so the parent can switch views. */
  onDone?: () => void;
}

export default function LoadingState({ finished, onDone }: Props) {
  const { progress, complete } = useSimulatedProgress(true);

  useEffect(() => {
    if (finished) {
      complete();
      const t = setTimeout(() => onDone?.(), 400);
      return () => clearTimeout(t);
    }
  }, [finished]);

  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-8">
      {/* Circular progress */}
      <div className="relative w-28 h-28">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" fill="none" className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="8" />
          <circle
            cx="60" cy="60" r="52" fill="none"
            className="stroke-primary-500"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 52}
            strokeDashoffset={2 * Math.PI * 52 * (1 - progress / 100)}
            style={{ transition: 'stroke-dashoffset 0.3s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">{progress}%</span>
        </div>
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Processing Your Case
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
          Our AI prosthodontist is reviewing the clinical data, reference material,
          and current evidence to build your treatment plan.
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="space-y-3 w-full max-w-xs">
        {steps.map(({ icon: Icon, text, threshold }, i) => {
          const active = progress >= threshold;
          return (
            <div
              key={i}
              className={`flex items-center gap-3 text-sm transition-colors duration-300 ${
                active
                  ? 'text-slate-800 dark:text-slate-200'
                  : 'text-slate-400 dark:text-slate-600'
              }`}
            >
              <Icon className={`w-4 h-4 transition-colors duration-300 ${active ? 'text-primary-500' : 'text-slate-300 dark:text-slate-600'}`} />
              <span>{text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
