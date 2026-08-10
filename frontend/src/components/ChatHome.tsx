import { Loader2, MessageSquarePlus } from 'lucide-react';
import SidebarToggle from './SidebarToggle';

const COLORS = {
  box: '#2D2D2D',
  border: '#424242',
  accent: '#F5A623',
  text: '#EDEDED',
  muted: '#949494',
};

interface ChatHomeProps {
  onStartNewChat?: () => void;
  isCreating?: boolean;
  onToggleSidebar?: () => void;
}

export default function ChatHome({ onStartNewChat, isCreating = false, onToggleSidebar }: ChatHomeProps) {
  return (
    <div className="h-full w-full bg-black text-white flex flex-col">
      {onToggleSidebar && (
        <header
          className="shrink-0 px-4 sm:px-6 py-3"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}
        >
          <SidebarToggle onClick={onToggleSidebar} />
        </header>
      )}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: COLORS.box, border: `1px solid ${COLORS.border}`, color: COLORS.accent }}
        >
          <MessageSquarePlus className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-semibold text-center" style={{ color: COLORS.text }}>
          Выберите чат или создайте новый
        </h1>
        <p className="text-sm mt-2 text-center max-w-sm" style={{ color: COLORS.muted }}>
          Откройте меню, чтобы выбрать чат, или создайте новый, чтобы начать общение с ИИ.
        </p>
        {onStartNewChat && (
          <button
            type="button"
            onClick={onStartNewChat}
            disabled={isCreating}
            className="mt-6 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 flex items-center gap-2"
            style={{ background: COLORS.accent, color: '#1a1a1a' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ffb64a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = COLORS.accent;
            }}
          >
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Новый чат
          </button>
        )}
      </div>
    </div>
  );
}
