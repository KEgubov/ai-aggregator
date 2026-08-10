import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { useModalPresence } from '../hooks/useModalPresence';

const COLORS = {
  box: '#2D2D2D',
  border: '#424242',
  text: '#EDEDED',
  muted: '#949494',
  accent: '#F5A623',
  error: '#f87171',
};

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  variant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  isLoading = false,
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const { mounted, entered } = useModalPresence(open);

  useEffect(() => {
    if (!mounted || !entered) return;

    cancelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isLoading) {
        onCancel();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mounted, entered, isLoading, onCancel]);

  if (!mounted) return null;

  const confirmBg = variant === 'danger' ? COLORS.error : COLORS.accent;
  const confirmText = '#1a1a1a';

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
    >
      <div
        className={`absolute inset-0 modal-backdrop${entered ? ' modal-backdrop-open' : ''}`}
        style={{ background: 'rgba(0, 0, 0, 0.72)' }}
        onClick={() => {
          if (!isLoading) onCancel();
        }}
        aria-hidden
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className={`relative w-full max-w-md rounded-2xl p-5 shadow-2xl modal-panel${entered ? ' modal-panel-open' : ''}`}
        style={{
          background: COLORS.box,
          border: `1px solid ${COLORS.border}`,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="confirm-dialog-title"
          className="text-base font-semibold"
          style={{ color: COLORS.text }}
        >
          {title}
        </h2>
        <p
          id="confirm-dialog-description"
          className="text-sm mt-2 leading-relaxed"
          style={{ color: COLORS.muted }}
        >
          {description}
        </p>

        <div className="flex gap-3 mt-5">
          <button
            ref={cancelRef}
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="flex-1 rounded-2xl py-3 text-sm transition-colors disabled:opacity-60"
            style={{ color: COLORS.muted, border: `1px solid ${COLORS.border}` }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className="flex-1 rounded-2xl py-3 text-sm font-medium flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
            style={{ background: confirmBg, color: confirmText }}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
