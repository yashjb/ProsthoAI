import { useState, useRef, useEffect } from 'react';
import { Upload, Sparkles, Loader2, Image as ImageIcon, ArrowLeft, Download, Check } from 'lucide-react';
import { analyzeShade } from '../api';
import { generateShadeMatchingPDF } from '../pdfGenerator';
import { useSimulatedProgress } from '../hooks/useSimulatedProgress';
import type { ShadeAnalysis } from '../types';

/** RAW formats browsers cannot natively decode */
const RAW_EXTENSIONS = new Set(['.dng', '.cr2', '.cr3', '.nef', '.arw', '.orf', '.raf', '.rw2']);

function isRawFile(file: File): boolean {
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  return RAW_EXTENSIONS.has(ext);
}

/**
 * Extract the largest embedded JPEG preview from a DNG/TIFF-based RAW file.
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
  } catch { /* fall through */ }
  return null;
}

interface Props {
  onBack: () => void;
}

export default function ShadeMatching({ onBack }: Props) {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [shadeResult, setShadeResult] = useState<{ image: string; analysis: ShadeAnalysis; filename: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { progress, complete: completeProgress } = useSimulatedProgress(isProcessing);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const raw = isRawFile(file);
    if (!file.type.startsWith('image/') && !raw) {
      setError('Please select a valid image file');
      return;
    }

    setSelectedImage(file);
    setError(null);
    setShadeResult(null);
    setSaved(false);

    if (raw) {
      // Extract embedded JPEG preview for RAW/DNG files
      const preview = await extractRawPreview(file);
      setImagePreview(preview); // may be null — handled in render
    } else {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleFindShade = async () => {
    if (!selectedImage) {
      setError('Please select an image first');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const data = await analyzeShade(selectedImage);

      if (data.success && data.shade_analysis) {
        let shadeData: ShadeAnalysis;
        try {
          let cleanData = data.shade_analysis.trim();
          if (cleanData.startsWith('```json')) cleanData = cleanData.substring(7);
          if (cleanData.startsWith('```')) cleanData = cleanData.substring(3);
          if (cleanData.endsWith('```')) cleanData = cleanData.slice(0, -3);
          shadeData = JSON.parse(cleanData.trim());
        } catch {
          shadeData = { raw_analysis: data.shade_analysis };
        }

        setShadeResult({
          image: data.image_data!,
          analysis: shadeData,
          filename: data.filename!,
        });
      } else {
        setError(data.error || 'Failed to analyze shade');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to server');
    } finally {
      completeProgress();
      // brief delay so the user sees 100% before the loader disappears
      await new Promise((r) => setTimeout(r, 400));
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setShadeResult(null);
    setSelectedImage(null);
    setImagePreview(null);
    setError(null);
    setSaved(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!shadeResult) return;
    try {
      await generateShadeMatchingPDF(
        shadeResult.image,
        shadeResult.filename,
        shadeResult.analysis,
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('PDF generation failed:', err);
    }
  };

  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* Sub-header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Shade Matching</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">AI-powered dental shade analysis</p>
          </div>
        </div>
        <div className="flex gap-3">
          {!shadeResult ? (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                Upload Image
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.dng,.cr2,.cr3,.nef,.arw,.orf,.raf,.rw2"
                onChange={handleFileSelect}
                className="hidden"
              />
              {selectedImage && (
                <button
                  onClick={handleFindShade}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Find Shade
                    </>
                  )}
                </button>
              )}
            </>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saved}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  saved
                    ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 cursor-default'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {saved ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                {saved ? 'Downloaded' : 'Save as PDF'}
              </button>
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
              >
                <Upload className="w-4 h-4" />
                New Analysis
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Processing */}
      {isProcessing && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-6 w-full max-w-xs">
            {/* Circular progress */}
            <div className="relative w-28 h-28 mx-auto">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" className="stroke-slate-600" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r="52" fill="none"
                  className="stroke-primary-400"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 52}
                  strokeDashoffset={2 * Math.PI * 52 * (1 - progress / 100)}
                  style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary-400">{progress}%</span>
              </div>
            </div>
            <div>
              <p className="text-slate-900 dark:text-white text-lg font-semibold">Analyzing dental shade…</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Using AI to match the perfect shade</p>
            </div>
            {/* Linear progress bar */}
            <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary-400 to-primary-500 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!selectedImage && !isProcessing && !shadeResult && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <ImageIcon className="w-20 h-20 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 text-lg">Upload a dental image to get started</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">Click "Upload Image" above</p>
          </div>
        </div>
      )}

      {/* Image preview before analysis */}
      {selectedImage && !shadeResult && !isProcessing && (
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 max-w-2xl">
            {imagePreview ? (
              <img src={imagePreview} alt="Selected dental image" className="w-full h-auto rounded-lg" />
            ) : (
              <div className="w-full h-64 rounded-lg bg-slate-100 dark:bg-slate-700 flex flex-col items-center justify-center gap-2">
                <ImageIcon className="w-16 h-16 text-slate-400" />
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  {selectedImage.name}
                </p>
                <p className="text-xs text-slate-400">
                  {(selectedImage.size / 1024 / 1024).toFixed(1)} MB — preview not available for this format
                </p>
              </div>
            )}
            <p className="text-slate-500 dark:text-slate-400 text-center mt-4 text-sm">
              Click "Find Shade" to analyze this image
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      {shadeResult && !isProcessing && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
          {/* Image */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center p-6">
            <img
              src={shadeResult.image}
              alt={shadeResult.filename}
              className="max-w-full max-h-[60vh] object-contain rounded-lg"
            />
          </div>

          {/* Analysis */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 overflow-y-auto max-h-[70vh]">
            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Shade Analysis Results</h3>
            </div>
            <ShadeDetails analysis={shadeResult.analysis} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-component: render analysis ── */
function ShadeDetails({ analysis }: { analysis: ShadeAnalysis }) {
  if (analysis.raw_analysis) {
    return (
      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-5">
        <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
          {analysis.raw_analysis}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Primary shade */}
      {analysis.primary_shade && (
        <div className="bg-gradient-to-r from-primary-600 to-purple-600 rounded-lg p-5 text-white">
          <p className="text-sm font-medium opacity-80">Recommended Shade</p>
          <p className="text-3xl font-extrabold mt-1">{analysis.primary_shade}</p>
          <p className="text-xs opacity-70 mt-1">Best matching shade for your crown</p>
        </div>
      )}

      {/* Characteristics */}
      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-5 space-y-3">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span className="w-1 h-5 bg-primary-500 rounded" />
          Shade Characteristics
        </h4>
        {([
          ['Shade Family', analysis.shade_family],
          ['Brightness', analysis.value],
          ['Color Intensity', analysis.chroma],
          ['Color Tone', analysis.hue],
        ] as const).map(([label, val]) =>
          val ? (
            <div key={label} className="flex gap-3 text-sm">
              <span className="text-slate-500 dark:text-slate-400 min-w-[120px]">{label}:</span>
              <span className="text-slate-900 dark:text-white font-medium">{val}</span>
            </div>
          ) : null,
        )}
      </div>

      {/* Alternatives */}
      {analysis.recommended_shades && analysis.recommended_shades.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-5">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
            <span className="w-1 h-5 bg-purple-500 rounded" />
            Alternative Shade Options
          </h4>
          <div className="flex flex-wrap gap-2">
            {analysis.recommended_shades.map((shade, i) => (
              <span
                key={i}
                className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-primary-600 text-white rounded-lg text-sm font-semibold"
              >
                {shade}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {analysis.notes && (
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-5">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
            <span className="w-1 h-5 bg-green-500 rounded" />
            Professional Analysis
          </h4>
          <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{analysis.notes}</p>
        </div>
      )}

      {/* Confidence */}
      {analysis.confidence && (
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-5">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Analysis Confidence</h4>
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1.5 rounded-lg font-bold text-sm text-white ${
                analysis.confidence === 'High'
                  ? 'bg-green-600'
                  : analysis.confidence === 'Medium'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              }`}
            >
              {analysis.confidence}
            </span>
            <span className="text-slate-500 dark:text-slate-400 text-xs">
              {analysis.confidence === 'High' && 'Highly accurate shade match'}
              {analysis.confidence === 'Medium' && 'Fairly accurate — verify with additional lighting'}
              {analysis.confidence === 'Low' && 'Please verify with additional lighting'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
