import { useEffect, useState } from 'react';

/** Keep in sync with `.modal-*` transition duration in index.css */
export const MODAL_ANIMATION_MS = 220;

/**
 * Keeps a modal mounted through its exit transition so CSS opacity/transform
 * animations can finish before unmount (manual presence, no animation lib).
 */
export function useModalPresence(open: boolean, durationMs = MODAL_ANIMATION_MS) {
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntered(true));
      });
      return () => cancelAnimationFrame(id);
    }

    setEntered(false);
    const timeout = window.setTimeout(() => setMounted(false), durationMs);
    return () => window.clearTimeout(timeout);
  }, [open, durationMs]);

  return { mounted, entered };
}
