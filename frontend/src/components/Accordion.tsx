import { useState, ReactNode } from 'react';
// Reusable collapsible section used throughout the results view
import { ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
/** Props for the collapsible Accordion component. */
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: string;
  badgeColor?: string;
}

export default function Accordion({
  title,
  children,
  defaultOpen = false,
  badge,
  badgeColor = 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  // Accordion starts open when defaultOpen is true (e.g. first section)

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          {open ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {title}
          </span>
          {badge && (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeColor}`}
            >
              {badge}
            </span>
          )}
        </div>
      </button>
      {open && <div className="px-5 pb-5 pt-1">{children}</div>}
    </div>
  );
}
