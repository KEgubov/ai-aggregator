import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';

export type SelectionQuote = {
  text: string;
  messageId: string;
};

interface ToolbarState extends SelectionQuote {
  top: number;
  left: number;
  placeBelow: boolean;
}

const MIN_CHARS = 2;
const BAR_GAP = 8;
const BAR_HEIGHT = 36;

const TOOLBAR_STYLES = `
.sel-ask-bar {
  position: fixed;
  z-index: 90;
  display: flex;
  align-items: center;
  height: 36px;
  padding: 0 4px;
  background: #2a2a2a;
  border: 1px solid #3a3a3a;
  border-radius: 999px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
  pointer-events: auto;
  user-select: none;
  animation: sel-ask-in 140ms cubic-bezier(0.32, 0.72, 0, 1) both;
}
.sel-ask-btn {
  border: none;
  background: transparent;
  color: #ededed;
  font: inherit;
  font-size: 13px;
  line-height: 1;
  padding: 0 14px;
  height: 28px;
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color .12s ease;
}
.sel-ask-btn:hover { background: rgba(255, 255, 255, 0.08); }
@keyframes sel-ask-in {
  from { opacity: 0; transform: translate(-50%, calc(-100% + 6px)) scale(0.96); }
  to { opacity: 1; transform: translate(-50%, -100%) scale(1); }
}
.sel-ask-bar.sel-ask-below {
  animation-name: sel-ask-in-below;
}
@keyframes sel-ask-in-below {
  from { opacity: 0; transform: translate(-50%, -6px) scale(0.96); }
  to { opacity: 1; transform: translate(-50%, 0) scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  .sel-ask-bar,
  .sel-ask-bar.sel-ask-below {
    animation: none !important;
  }
}
`;

function isIgnoredTarget(node: Node | null): boolean {
  const el = node instanceof Element ? node : node?.parentElement;
  if (!el) return true;
  return Boolean(el.closest('input, textarea, [contenteditable="true"], .cip-root, .sel-ask-bar'));
}

function readQuote(root: HTMLElement): ToolbarState | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;

  const text = sel.toString().replace(/\s+/g, ' ').trim();
  if (text.length < MIN_CHARS) return null;

  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return null;
  if (isIgnoredTarget(range.commonAncestorContainer)) return null;

  const host =
    range.commonAncestorContainer instanceof Element
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement;
  const messageEl = host?.closest('[data-message-id]') as HTMLElement | null;
  const messageId = messageEl?.dataset.messageId;
  if (!messageId) return null;

  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;

  const placeBelow = rect.top < BAR_HEIGHT + BAR_GAP + 8;
  const left = Math.min(
    Math.max(rect.left + rect.width / 2, 72),
    window.innerWidth - 72,
  );

  return {
    text,
    messageId,
    top: placeBelow ? rect.bottom + BAR_GAP : rect.top - BAR_GAP,
    left,
    placeBelow,
  };
}

interface SelectionAskToolbarProps {
  rootRef: RefObject<HTMLElement | null>;
  onAsk: (quote: SelectionQuote) => void;
}

export default function SelectionAskToolbar({ rootRef, onAsk }: SelectionAskToolbarProps) {
  const [toolbar, setToolbar] = useState<ToolbarState | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const suppressHideRef = useRef(false);

  const hide = useCallback(() => {
    if (suppressHideRef.current) return;
    setToolbar(null);
  }, []);

  const sync = useCallback(() => {
    const root = rootRef.current;
    if (!root) {
      setToolbar(null);
      return;
    }
    setToolbar(readQuote(root));
  }, [rootRef]);

  useEffect(() => {
    let showTimer: number | null = null;

    function clearShowTimer() {
      if (showTimer != null) {
        window.clearTimeout(showTimer);
        showTimer = null;
      }
    }

    function scheduleSync() {
      clearShowTimer();
      showTimer = window.setTimeout(() => {
        showTimer = null;
        sync();
      }, 160);
    }

    let pressing = false;

    function onMouseUp(event: MouseEvent | TouchEvent) {
      pressing = false;
      if (barRef.current?.contains(event.target as Node)) return;
      clearShowTimer();
      window.requestAnimationFrame(sync);
    }

    function onSelectionChange() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        clearShowTimer();
        hide();
        return;
      }
      if (pressing) return;
      scheduleSync();
    }

    function onPointerDown(event: PointerEvent) {
      pressing = true;
      if (barRef.current?.contains(event.target as Node)) return;
      hide();
    }

    function onPointerUp() {
      pressing = false;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') hide();
    }

    function onScroll() {
      hide();
    }

    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('touchend', onMouseUp);
    document.addEventListener('selectionchange', onSelectionChange);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);

    return () => {
      clearShowTimer();
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('touchend', onMouseUp);
      document.removeEventListener('selectionchange', onSelectionChange);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [hide, sync]);

  if (!toolbar || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={barRef}
      className={toolbar.placeBelow ? 'sel-ask-bar sel-ask-below' : 'sel-ask-bar'}
      style={{
        top: toolbar.top,
        left: toolbar.left,
        transform: toolbar.placeBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
      }}
      onMouseDown={(event) => {
        event.preventDefault();
        suppressHideRef.current = true;
      }}
      onMouseUp={() => {
        suppressHideRef.current = false;
      }}
    >
      <style>{TOOLBAR_STYLES}</style>
      <button
        type="button"
        className="sel-ask-btn"
        onClick={() => {
          onAsk({ text: toolbar.text, messageId: toolbar.messageId });
          window.getSelection()?.removeAllRanges();
          setToolbar(null);
          suppressHideRef.current = false;
        }}
      >
        Спросить
      </button>
    </div>,
    document.body,
  );
}
