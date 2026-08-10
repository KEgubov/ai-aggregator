import { flushSync } from 'react-dom';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Runs a React state update inside the View Transition API when available
 * (see https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API).
 * Uses flushSync so the DOM commit happens inside the transition callback.
 */
export function startViewTransition(update: () => void): void {
  if (typeof document === 'undefined' || prefersReducedMotion()) {
    update();
    return;
  }

  const start = document.startViewTransition?.bind(document);
  if (!start) {
    update();
    return;
  }

  start(() => {
    flushSync(update);
  });
}
