import { useCallback, useEffect, useState } from 'react';
import { Loader2, Mail, UserRound } from 'lucide-react';
import { fetchProfile } from '../api/auth';
import { ApiError } from '../api/client';
import { initialsFromEmail, type UserProfile } from '../types/user';
import SidebarToggle from './SidebarToggle';

const COLORS = {
  box: '#2D2D2D',
  border: '#424242',
  card: '#252525',
  accent: '#F5A623',
  text: '#EDEDED',
  muted: '#949494',
  error: '#f87171',
};

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface ProfilePageProps {
  onToggleSidebar?: () => void;
}

export default function ProfilePage({ onToggleSidebar }: ProfilePageProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchProfile();
      setProfile(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить профиль');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  return (
    <div className="h-full w-full bg-black text-white flex flex-col">
      <header
        className="shrink-0 px-4 sm:px-6 py-4"
        style={{
          borderBottom: `1px solid ${COLORS.border}`,
          paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {onToggleSidebar && <SidebarToggle onClick={onToggleSidebar} />}
          <div className="min-w-0">
            <h1 className="text-lg font-semibold" style={{ color: COLORS.text }}>
              Профиль
            </h1>
            <p className="text-xs mt-0.5" style={{ color: COLORS.muted }}>
              Данные вашего аккаунта
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="w-full max-w-md mx-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: COLORS.accent }} />
              <p className="text-sm" style={{ color: COLORS.muted }}>
                Загрузка профиля…
              </p>
            </div>
          ) : error ? (
            <div
              className="rounded-2xl p-6 text-center space-y-4"
              style={{ background: COLORS.box, border: `1px solid ${COLORS.border}` }}
            >
              <p className="text-sm" style={{ color: COLORS.error }}>
                {error}
              </p>
              <button
                type="button"
                onClick={() => void loadProfile()}
                className="rounded-2xl px-5 py-2.5 text-sm font-medium"
                style={{ background: COLORS.accent, color: '#1a1a1a' }}
              >
                Повторить
              </button>
            </div>
          ) : profile ? (
            <div className="space-y-4">
              <div
                className="rounded-3xl p-6 flex flex-col items-center text-center"
                style={{ background: COLORS.box, border: `1px solid ${COLORS.border}` }}
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-semibold mb-4"
                  style={{
                    background: '#1f1f1f',
                    color: COLORS.accent,
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  {initialsFromEmail(profile.email)}
                </div>
                <h2 className="text-xl font-semibold" style={{ color: COLORS.text }}>
                  {profile.email.split('@')[0]}
                </h2>
                {profile.about_me ? (
                  <p className="text-sm mt-2" style={{ color: COLORS.muted }}>
                    {profile.about_me}
                  </p>
                ) : (
                  <p className="text-sm mt-2" style={{ color: COLORS.muted }}>
                    Описание не указано
                  </p>
                )}
              </div>

              <div
                className="rounded-2xl overflow-hidden"
                style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
              >
                <div
                  className="px-4 py-3.5 flex items-start gap-3"
                  style={{ borderBottom: `1px solid ${COLORS.border}` }}
                >
                  <span
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: '#1f1f1f', color: COLORS.accent }}
                  >
                    <Mail className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs" style={{ color: COLORS.muted }}>
                      Email
                    </p>
                    <p className="text-sm mt-0.5 break-all" style={{ color: COLORS.text }}>
                      {profile.email}
                    </p>
                  </div>
                </div>

                <div
                  className="px-4 py-3.5 flex items-start gap-3"
                  style={{ borderBottom: `1px solid ${COLORS.border}` }}
                >
                  <span
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: '#1f1f1f', color: COLORS.accent }}
                  >
                    <UserRound className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs" style={{ color: COLORS.muted }}>
                      ID пользователя
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: COLORS.text }}>
                      {profile.user_id}
                    </p>
                  </div>
                </div>

                <div
                  className="px-4 py-3.5"
                  style={{ borderBottom: `1px solid ${COLORS.border}` }}
                >
                  <p className="text-xs" style={{ color: COLORS.muted }}>
                    Дата регистрации
                  </p>
                  <p className="text-sm mt-0.5" style={{ color: COLORS.text }}>
                    {formatDate(profile.created_at)}
                  </p>
                </div>

                <div className="px-4 py-3.5">
                  <p className="text-xs" style={{ color: COLORS.muted }}>
                    Последняя активность
                  </p>
                  <p className="text-sm mt-0.5" style={{ color: COLORS.text }}>
                    {formatDate(profile.last_seen_at)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
