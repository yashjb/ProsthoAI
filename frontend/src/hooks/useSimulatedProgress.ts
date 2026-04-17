import { useState, useEffect, useRef } from 'react';

/**
 * Simulates a progress bar from 0→100%.
 * Advances quickly at first, then slows down as it approaches 90%.
 * Call `complete()` to jump to 100%.
 */
export function useSimulatedProgress(active: boolean) {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!active) {
      setProgress(0);
      return;
    }

    setProgress(0);

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev + 0.2;   // crawl near the end
        if (prev >= 70) return prev + 0.5;
        if (prev >= 50) return prev + 1;
        if (prev >= 30) return prev + 2;
        return prev + 3;                       // fast at the start
      });
    }, 300);

    return () => clearInterval(intervalRef.current);
  }, [active]);

  const complete = () => {
    clearInterval(intervalRef.current);
    setProgress(100);
  };

  return { progress: Math.min(Math.round(progress), 100), complete };
}
