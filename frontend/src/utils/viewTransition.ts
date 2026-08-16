import { flushSync } from 'react-dom';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function supportsViewTransition(): boolean {
  return (
    typeof document !== 'undefined' &&
    typeof document.startViewTransition === 'function' &&
    !prefersReducedMotion()
  );
}

/** True while a directional view transition class is on <html>. */
export function isViewTransitioning(): boolean {
  if (typeof document === 'undefined') return false;
  const { classList } = document.documentElement;
  return (
    classList.contains('vt-to-home') ||
    classList.contains('vt-to-chat') ||
    classList.contains('vt-auth-enter')
  );
}

/**
 * Runs a React state update inside the View Transition API when available
 * (see https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API).
 * Uses flushSync so the DOM commit happens inside the transition callback.
 *
 * Optional `className` is set on <html> for the duration of the transition
 * so CSS can scope root animations (e.g. auth → app).
 */
export function startViewTransition(
  update: () => void,
  options?: { className?: string },
): void {
  const className = options?.className;
  const root = typeof document !== 'undefined' ? document.documentElement : null;

  if (typeof document === 'undefined' || prefersReducedMotion()) {
    update();
    return;
  }

  const start = document.startViewTransition?.bind(document);
  if (!start) {
    update();
    return;
  }

  if (className && root) root.classList.add(className);

  const transition = start(() => {
    flushSync(update);
  });

  void transition.finished.finally(() => {
    if (className && root) root.classList.remove(className);
  });
}
