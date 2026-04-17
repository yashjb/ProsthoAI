import { useRef, useState, useEffect } from 'react';
import { Camera, X, FileImage, Plus } from 'lucide-react';
import type { ClinicalPhotos } from '../types';
import { clinicalPhotoFields } from '../types';

/** RAW formats browsers cannot natively decode — extract embedded JPEG preview */
const RAW_EXTENSIONS = new Set(['.dng', '.cr2', '.cr3', '.nef', '.arw', '.orf', '.raf', '.rw2']);
const DICOM_EXTENSIONS = new Set(['.dcm', '.dicom']);

function isRawFile(file: File): boolean {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  return RAW_EXTENSIONS.has(ext);
}

function isDicomFile(file: File): boolean {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  return DICOM_EXTENSIONS.has(ext);
}

function getFileExtension(file: File): string {
  return (file.name.split('.').pop() ?? '').toUpperCase();
}

/**
 * Extract the largest embedded JPEG preview from a DNG/TIFF-based RAW file.
 * RAW files (especially DNG) contain embedded JPEG thumbnails/previews.
 * We scan for JPEG SOI (0xFF 0xD8) and EOI (0xFF 0xD9) markers and pick the largest blob.
 */
async function extractRawPreview(file: File): Promise<string | null> {
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    let bestStart = -1;
    let bestLength = 0;
    let currentStart = -1;

    for (let i = 0; i < bytes.length - 1; i++) {
      if (bytes[i] === 0xff) {
        if (bytes[i + 1] === 0xd8) {
          currentStart = i;
        } else if (bytes[i + 1] === 0xd9 && currentStart >= 0) {
          const len = i + 2 - currentStart;
          if (len > bestLength) {
            bestStart = currentStart;
            bestLength = len;
          }
          currentStart = -1;
        }
      }
    }

    if (bestStart >= 0 && bestLength > 1000) {
      const jpegBytes = bytes.slice(bestStart, bestStart + bestLength);
      const blob = new Blob([jpegBytes], { type: 'image/jpeg' });
      return URL.createObjectURL(blob);
    }
  } catch {
    // extraction failed — fall back to icon
  }
  return null;
}

interface Props {
  photos: ClinicalPhotos;
  onChange: (photos: ClinicalPhotos) => void;
}

export default function ClinicalPhotosUpload({ photos, onChange }: Props) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [rawPreviews, setRawPreviews] = useState<Record<string, string>>({});

  // Extract embedded JPEG previews from RAW files (DNG, etc.) — single-file fields only
  useEffect(() => {
    for (const field of clinicalPhotoFields) {
      if (field.multiple) continue;
      const file = photos[field.key] as File | undefined;
      if (file && isRawFile(file) && !rawPreviews[field.key]) {
        extractRawPreview(file).then((url) => {
          if (url) {
            setRawPreviews((prev) => ({ ...prev, [field.key]: url }));
          }
        });
      }
      if (!file && rawPreviews[field.key]) {
        URL.revokeObjectURL(rawPreviews[field.key]);
        setRawPreviews((prev) => {
          const next = { ...prev };
          delete next[field.key];
          return next;
        });
      }
    }
  }, [photos]);

  const setPhoto = (key: keyof ClinicalPhotos, file: File | undefined) => {
    if (!file && rawPreviews[key]) {
      URL.revokeObjectURL(rawPreviews[key]);
      setRawPreviews((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
    onChange({ ...photos, [key]: file });
  };

  const addMultiFiles = (key: keyof ClinicalPhotos, newFiles: File[]) => {
    const existing = (photos[key] as File[] | undefined) ?? [];
    onChange({ ...photos, [key]: [...existing, ...newFiles] });
  };

  const removeMultiFile = (key: keyof ClinicalPhotos, index: number) => {
    const existing = (photos[key] as File[] | undefined) ?? [];
    onChange({ ...photos, [key]: existing.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Camera className="w-5 h-5 text-primary-500" />
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
          Clinical Photographs &amp; Imaging
        </h3>
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500">
        Upload clinical photographs and radiographic records for comprehensive case evaluation.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {clinicalPhotoFields.map((field) => {
          /* ── Multi-file field (radiographic_record) ── */
          if (field.multiple) {
            const files = (photos[field.key] as File[] | undefined) ?? [];
            return (
              <div
                key={field.key}
                className="relative group rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 overflow-hidden transition-all hover:border-primary-300 dark:hover:border-primary-600 sm:col-span-2"
              >
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      {field.label}
                    </p>
                    <button
                      type="button"
                      onClick={() => inputRefs.current[field.key]?.click()}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Add files
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">
                    DICOM (.dcm) &amp; image files (JPG, PNG, DNG) accepted — upload multiple
                  </p>

                  {files.length > 0 ? (
                    <div className="space-y-1.5">
                      {files.map((file, idx) => {
                        const raw = isRawFile(file);
                        const dicom = isDicomFile(file);
                        const canPreview = !raw && !dicom && file.type.startsWith('image/');
                        return (
                          <div key={`${file.name}-${idx}`} className="flex items-center gap-3 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                            {canPreview ? (
                              <img
                                src={URL.createObjectURL(file)}
                                alt={file.name}
                                className="w-10 h-10 rounded-lg object-cover shrink-0"
                                onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 flex flex-col items-center justify-center shrink-0 gap-0.5">
                                <FileImage className="w-5 h-5 text-slate-400" />
                                <span className="text-[8px] font-bold text-slate-400 leading-none tracking-wide">
                                  {getFileExtension(file)}
                                </span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{file.name}</p>
                              <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeMultiFile(field.key, idx)}
                              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
                              aria-label={`Remove ${file.name}`}
                            >
                              <X className="w-4 h-4 text-slate-400" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => inputRefs.current[field.key]?.click()}
                      className="w-full py-6 flex flex-col items-center gap-1 cursor-pointer"
                    >
                      <Camera className="w-6 h-6 text-slate-300" />
                      <span className="text-xs text-slate-400">Click to upload radiographic files</span>
                    </button>
                  )}
                </div>
                <input
                  ref={(el) => { inputRefs.current[field.key] = el; }}
                  type="file"
                  accept={field.accept}
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const selected = e.target.files;
                    if (selected && selected.length > 0) {
                      addMultiFiles(field.key, Array.from(selected));
                    }
                    e.target.value = '';
                  }}
                />
              </div>
            );
          }

          /* ── Single-file field ── */
          const file = photos[field.key] as File | undefined;
          const raw = file ? isRawFile(file) : false;
          const rawPreviewUrl = raw ? rawPreviews[field.key] : undefined;
          const previewUrl = file && !raw && file.type.startsWith('image/')
            ? URL.createObjectURL(file)
            : rawPreviewUrl ?? null;

          return (
            <div
              key={field.key}
              className="relative group rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 overflow-hidden transition-all hover:border-primary-300 dark:hover:border-primary-600"
            >
              {file ? (
                <div className="flex items-center gap-3 p-3">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt={field.label}
                      className="w-14 h-14 rounded-lg object-cover shrink-0"
                      onLoad={() => { if (!raw) URL.revokeObjectURL(previewUrl); }}
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-slate-200 dark:bg-slate-700 flex flex-col items-center justify-center shrink-0 gap-0.5">
                      <FileImage className="w-6 h-6 text-slate-400" />
                      {raw && (
                        <span className="text-[9px] font-bold text-slate-400 leading-none tracking-wide">
                          {getFileExtension(file)}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-0.5">
                      {field.label}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{file.name}</p>
                    <p className="text-xs text-slate-400">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPhoto(field.key, undefined)}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
                    aria-label={`Remove ${field.label}`}
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => inputRefs.current[field.key]?.click()}
                  className="w-full p-4 text-left flex items-center gap-3 cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0">
                    <Camera className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      {field.label}
                    </p>
                    <p className="text-xs text-slate-400">Click to upload</p>
                  </div>
                </button>
              )}
              <input
                ref={(el) => { inputRefs.current[field.key] = el; }}
                type="file"
                accept={field.accept}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setPhoto(field.key, f);
                  e.target.value = '';
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
