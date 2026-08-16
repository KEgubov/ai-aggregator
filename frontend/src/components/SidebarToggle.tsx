import { PanelLeft } from 'lucide-react';

const COLORS = {
  border: '#424242',
  card: '#252525',
  text: '#EDEDED',
  muted: '#949494',
};

interface SidebarToggleProps {
  onClick: () => void;
  label?: string;
}

export default function SidebarToggle({ onClick, label = 'Открыть меню' }: SidebarToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="sidebar-toggle shrink-0 p-2 rounded-lg transition-colors"
      style={{ color: COLORS.muted }}
      aria-label={label}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = COLORS.text;
        e.currentTarget.style.background = COLORS.card;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = COLORS.muted;
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <PanelLeft className="w-5 h-5" />
    </button>
  );
}
