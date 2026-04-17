import { Moon, Sun, Stethoscope, Palette, FolderOpen, History } from 'lucide-react';

interface Props {
  dark: boolean;
  onToggle: () => void;
  onShadeMatch?: () => void;
  shadeActive?: boolean;
  onSavedPlans?: () => void;
  savedPlansActive?: boolean;
  onSavedShades?: () => void;
  savedShadesActive?: boolean;
}

export default function Header({ dark, onToggle, onShadeMatch, shadeActive, onSavedPlans, savedPlansActive, onSavedShades, savedShadesActive }: Props) {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/30">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Prosthodontic Intelligence
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-medium -mt-0.5">
              Treatment Planning Assistant
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onSavedPlans}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              savedPlansActive
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
            title="Saved Treatment Plans"
          >
            <FolderOpen className="w-4 h-4" />
            <span className="hidden md:inline">Saved Plans</span>
          </button>
          <button
            onClick={onSavedShades}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              savedShadesActive
                ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
            title="Saved Shade Results"
          >
            <History className="w-4 h-4" />
            <span className="hidden md:inline">Saved Shades</span>
          </button>
          <button
            onClick={onShadeMatch}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              shadeActive
                ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">Shade Matcher</span>
          </button>
          <button
            onClick={onToggle}
            aria-label="Toggle dark mode"
            className="p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {dark ? (
              <Sun className="w-5 h-5 text-yellow-400" />
            ) : (
              <Moon className="w-5 h-5 text-slate-500" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
