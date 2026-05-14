import { useState, useEffect } from 'react';

/**
 * Returns a human-readable countdown string, updating every second.
 * e.g. "2h 34m left", "Opens in 1d 4h", "Ended"
 */
export function useCountdown(startTime, endTime, status) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    function compute() {
      const now = Date.now();
      const end = new Date(endTime).getTime();
      const start = new Date(startTime).getTime();

      if (status === 'completed' || now > end) {
        setLabel('Ended');
        return;
      }
      if (status === 'upcoming' || now < start) {
        const diff = start - now;
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        setLabel(d > 0 ? `Opens in ${d}d ${h}h` : h > 0 ? `Opens in ${h}h ${m}m` : `Opens in ${m}m`);
        return;
      }
      // Active
      const diff = end - now;
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLabel(d > 0 ? `${d}d ${h}h left` : h > 0 ? `${h}h ${m}m left` : `${m}m ${s}s left`);
    }

    compute();
    const t = setInterval(compute, 1000);
    return () => clearInterval(t);
  }, [startTime, endTime, status]);

  return label;
}
