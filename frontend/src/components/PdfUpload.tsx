import { useCallback, useRef, useState } from 'react';
import { Upload, X, FileText } from 'lucide-react';

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
}

export default function PdfUpload({ files, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const addFiles = useCallback(
    (incoming: FileList | null) => {
      if (!incoming) return;
      const pdfs = Array.from(incoming).filter(
        (f) => f.type === 'application/pdf',
      );
      onChange([...files, ...pdfs].slice(0, 5));
    },
    [files, onChange],
  );

  const remove = (idx: number) => {
    onChange(files.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
        Upload Reference PDFs{' '}
        <span className="text-slate-400 font-normal">(max 5)</span>
      </label>

      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
          dragging
            ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20'
            : 'border-slate-300 dark:border-slate-600 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
        }`}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          <span className="font-medium text-primary-600 dark:text-primary-400">
            Click to upload
          </span>{' '}
          or drag and drop PDF files
        </p>
        <p className="text-xs text-slate-400 mt-1">PDF only • Up to 20 MB each</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center gap-3 rounded-lg bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm"
            >
              <FileText className="w-4 h-4 text-primary-500 shrink-0" />
              <span className="truncate flex-1 text-slate-700 dark:text-slate-300">
                {f.name}
              </span>
              <span className="text-xs text-slate-400">
                {(f.size / 1024 / 1024).toFixed(1)} MB
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  remove(i);
                }}
                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                aria-label={`Remove ${f.name}`}
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
