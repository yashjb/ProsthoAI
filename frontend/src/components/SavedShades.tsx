import { useState } from 'react';
import { ArrowLeft, Trash2, Calendar, Palette, Sparkles } from 'lucide-react';
import type { SavedShadeResult } from '../storage';
import { getSavedShades, deleteShade } from '../storage';
import type { ShadeAnalysis } from '../types';

interface Props {
  onBack: () => void;
}

export default function SavedShades({ onBack }: Props) {
  const [shades, setShades] = useState<SavedShadeResult[]>(getSavedShades);
  const [viewingShade, setViewingShade] = useState<SavedShadeResult | null>(null);

  const handleDelete = (id: string) => {
    deleteShade(id);
    setShades(getSavedShades());
    if (viewingShade?.id === id) setViewingShade(null);
  };

  if (viewingShade) {
    return (
      <div className="flex flex-col min-h-0 flex-1">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setViewingShade(null)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Shade Analysis</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {viewingShade.filename} — {new Date(viewingShade.savedAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
          {/* Image */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center p-6">
            <img
              src={viewingShade.imageData}
              alt={viewingShade.filename}
              className="max-w-full max-h-[60vh] object-contain rounded-lg"
            />
          </div>

          {/* Analysis */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 p-6 overflow-y-auto max-h-[70vh]">
            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Shade Analysis Results</h3>
            </div>
            <ShadeDetails analysis={viewingShade.shadeAnalysis} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-500 dark:text-slate-400" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Saved Shade Analyses</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {shades.length} saved result{shades.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {shades.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Palette className="w-20 h-20 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 text-lg">No saved shade analyses yet</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
              Run a shade analysis and click "Save Result" to save it here
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shades.map((shade) => (
            <div
              key={shade.id}
              className="bg-white dark:bg-slate-800/60 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden group"
            >
              {/* Thumbnail */}
              <div className="aspect-[4/3] relative overflow-hidden bg-slate-100 dark:bg-slate-700">
                <img
                  src={shade.imageData}
                  alt={shade.filename}
                  className="w-full h-full object-cover"
                />
                {shade.shadeAnalysis.primary_shade && (
                  <div className="absolute top-2 right-2 bg-gradient-to-r from-primary-600 to-purple-600 text-white text-sm font-bold px-3 py-1 rounded-lg shadow">
                    {shade.shadeAnalysis.primary_shade}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {shade.filename}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(shade.savedAt).toLocaleDateString()} at{' '}
                    {new Date(shade.savedAt).toLocaleTimeString()}
                  </span>
                </div>
                {shade.shadeAnalysis.confidence && (
                  <span
                    className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold text-white ${
                      shade.shadeAnalysis.confidence === 'High'
                        ? 'bg-green-600'
                        : shade.shadeAnalysis.confidence === 'Medium'
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                  >
                    {shade.shadeAnalysis.confidence} confidence
                  </span>
                )}

                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => setViewingShade(shade)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium transition-colors"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => handleDelete(shade.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Shade Details (reused from ShadeMatching) ── */
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
      {analysis.primary_shade && (
        <div className="bg-gradient-to-r from-primary-600 to-purple-600 rounded-lg p-5 text-white">
          <p className="text-sm font-medium opacity-80">Recommended Shade</p>
          <p className="text-3xl font-extrabold mt-1">{analysis.primary_shade}</p>
          <p className="text-xs opacity-70 mt-1">Best matching shade for your crown</p>
        </div>
      )}

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

      {analysis.notes && (
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-5">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
            <span className="w-1 h-5 bg-green-500 rounded" />
            Professional Analysis
          </h4>
          <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{analysis.notes}</p>
        </div>
      )}

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
