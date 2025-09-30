import { Moon, Sun, Stethoscope } from 'lucide-react';

interface Props {
  dark: boolean;
  onToggle: () => void;
}

export default function Header({ dark, onToggle }: Props) {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/30">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Prosthetic Intelligence
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-medium -mt-0.5">
              Treatment Planning Assistant
            </p>
          </div>
        </div>
        <button
          onClick={onToggle}
          aria-label="Toggle dark mode"
          className="cursor-pointer p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {dark ? (
            <Sun className="w-5 h-5 text-yellow-400" />
          ) : (
            <Moon className="w-5 h-5 text-slate-500" />
          )}
        </button>
      </div>
    </header>
  );
}
