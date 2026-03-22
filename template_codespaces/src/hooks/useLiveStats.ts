import { useState, useEffect } from "react";

/**
 * Hook to simulate live ticket sales and gate check-ins.
 * @param initialSold Initial number of tickets sold
 * @param initialChecked Initial number of tickets checked in
 * @param cap Maximum capacity of the event
 */
export function useLiveStats(initialSold: number, initialChecked: number, cap: number) {
  const [sold, setSold] = useState(initialSold);
  const [checked, setChecked] = useState(initialChecked);

  useEffect(() => {
    const interval = setInterval(() => {
      const r = Math.random();
      // 40% probability of new ticket sold
      if (r > 0.6) {
        setSold(s => {
          const newSold = s < cap ? s + 1 : s;
          // 30% probability of someone scanning their ticket
          if (r > 0.7) {
            setChecked(c => (c < newSold ? c + 1 : c));
          }
          return newSold;
        });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [cap]);

  return { sold, checked };
}
