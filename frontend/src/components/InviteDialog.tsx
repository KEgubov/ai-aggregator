import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { useModalPresence } from '../hooks/useModalPresence';
import { initialsFromName } from '../types/user';

const COLORS = {
  box: '#2D2D2D',
  border: '#424242',
  text: '#EDEDED',
  muted: '#949494',
  accent: '#F5A623',
};

interface InviteDialogProps {
  open: boolean;
  name: string;
  description?: string | null;
  alreadyMember?: boolean;
  isLoading?: boolean;
  onJoin: () => void;
  onDecline: () => void;
}

export default function InviteDialog({
  open,
  name,
  description,
  alreadyMember = false,
  isLoading = false,
  onJoin,
  onDecline,
}: InviteDialogProps) {
  const declineRef = useRef<HTMLButtonElement>(null);
  const { mounted, entered } = useModalPresence(open);

  useEffect(() => {
    if (!mounted || !entered) return;

    declineRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isLoading) {
        onDecline();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mounted, entered, isLoading, onDecline]);

  if (!mounted) return null;

  const subtitle = alreadyMember
    ? 'Вы уже участник этого чата.'
    : description?.trim() || 'Вас пригласили в этот чат.';

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
    >
      <div
        className={`absolute inset-0 modal-backdrop${entered ? ' modal-backdrop-open' : ''}`}
        style={{ background: 'rgba(0, 0, 0, 0.72)' }}
        onClick={() => {
          if (!isLoading) onDecline();
        }}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-dialog-title"
        aria-describedby="invite-dialog-description"
        className={`relative w-full max-w-md rounded-2xl p-5 shadow-2xl modal-panel${entered ? ' modal-panel-open' : ''}`}
        style={{
          background: COLORS.box,
          border: `1px solid ${COLORS.border}`,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-semibold mb-4"
            style={{
              background: '#252525',
              color: COLORS.accent,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            {initialsFromName(name)}
          </div>
          <h2
            id="invite-dialog-title"
            className="text-lg font-semibold max-w-full truncate"
            style={{ color: COLORS.text }}
            title={name}
          >
            {name}
          </h2>
          <p
            id="invite-dialog-description"
            className="text-sm mt-2 leading-relaxed"
            style={{ color: COLORS.muted }}
          >
            {subtitle}
          </p>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            ref={declineRef}
            type="button"
            disabled={isLoading}
            onClick={onDecline}
            className="flex-1 rounded-2xl py-3 text-sm transition-colors disabled:opacity-60"
            style={{ color: COLORS.muted, border: `1px solid ${COLORS.border}` }}
          >
            Отклонить
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onJoin}
            className="flex-1 rounded-2xl py-3 text-sm font-medium flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
            style={{ background: COLORS.accent, color: '#1a1a1a' }}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {alreadyMember ? 'Открыть' : 'Войти'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
