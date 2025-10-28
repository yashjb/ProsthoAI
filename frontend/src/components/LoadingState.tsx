import { Loader2, Brain, FileSearch, Stethoscope } from 'lucide-react';

const steps = [
  { icon: FileSearch, text: 'Extracting reference material…' },
  { icon: Brain, text: 'Analyzing clinical data…' },
  { icon: Stethoscope, text: 'Generating treatment plan…' },
];

/** Displays animated loading indicator while AI processes the case. */
export default function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-8">
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-2xl shadow-primary-500/40">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
        <div className="absolute -inset-3 rounded-full border-2 border-primary-200 dark:border-primary-800 animate-ping opacity-30" />
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
      <div className="space-y-3 w-full max-w-xs">
        {steps.map(({ icon: Icon, text }, i) => (
          <div
            key={i}
            className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 animate-pulse"
            style={{ animationDelay: `${i * 0.5}s` }}
          >
            <Icon className="w-4 h-4 text-primary-500" />
            <span>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
