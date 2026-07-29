import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Check, Loader2, Mail, Pencil, UserRound } from 'lucide-react';
import { changeUsername, fetchProfile } from '../api/auth';
import { ApiError } from '../api/client';
import { initialsFromName, type UserProfile } from '../types/user';
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

const USERNAME_MAX = 100;

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
  onUsernameChange?: (username: string) => void;
}

export default function ProfilePage({ onToggleSidebar, onUsernameChange }: ProfilePageProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState<string | null>(null);
  const [isSavingName, setIsSavingName] = useState(false);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchProfile();
      setProfile(data);
      setNameDraft(data.username);
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

  async function handleSaveUsername(e: FormEvent) {
    e.preventDefault();
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setNameError('Имя не может быть пустым');
      return;
    }
    if (trimmed.length > USERNAME_MAX) {
      setNameError(`Максимум ${USERNAME_MAX} символов`);
      return;
    }
    if (profile && trimmed === profile.username) {
      setIsEditingName(false);
      setNameError(null);
      return;
    }

    setIsSavingName(true);
    setNameError(null);
    setNameSuccess(null);
    try {
      const newName = await changeUsername(trimmed);
      setProfile((prev) => (prev ? { ...prev, username: newName } : prev));
      setNameDraft(newName);
      setIsEditingName(false);
      setNameSuccess('Имя обновлено');
      onUsernameChange?.(newName);
    } catch (err) {
      if (err instanceof ApiError) {
        setNameError(err.message);
      } else {
        setNameError(err instanceof Error ? err.message : 'Не удалось сменить имя');
      }
    } finally {
      setIsSavingName(false);
    }
  }

  function startEditingName() {
    if (!profile) return;
    setNameDraft(profile.username);
    setNameError(null);
    setNameSuccess(null);
    setIsEditingName(true);
  }

  function cancelEditingName() {
    if (profile) setNameDraft(profile.username);
    setNameError(null);
    setIsEditingName(false);
  }

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
                  {initialsFromName(profile.username)}
                </div>

                {isEditingName ? (
                  <form onSubmit={(e) => void handleSaveUsername(e)} className="w-full max-w-xs space-y-3">
                    <input
                      type="text"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      maxLength={USERNAME_MAX}
                      autoFocus
                      disabled={isSavingName}
                      className="w-full rounded-xl px-3 py-2 text-center text-lg font-semibold outline-none"
                      style={{
                        background: '#1f1f1f',
                        color: COLORS.text,
                        border: `1px solid ${COLORS.border}`,
                      }}
                      aria-label="Имя пользователя"
                    />
                    <div className="flex gap-2 justify-center">
                      <button
                        type="button"
                        onClick={cancelEditingName}
                        disabled={isSavingName}
                        className="rounded-xl px-4 py-2 text-sm"
                        style={{ color: COLORS.muted, border: `1px solid ${COLORS.border}` }}
                      >
                        Отмена
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingName || !nameDraft.trim()}
                        className="rounded-xl px-4 py-2 text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-50"
                        style={{ background: COLORS.accent, color: '#1a1a1a' }}
                      >
                        {isSavingName ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        Сохранить
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold" style={{ color: COLORS.text }}>
                      {profile.username}
                    </h2>
                    <button
                      type="button"
                      onClick={startEditingName}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: COLORS.muted }}
                      aria-label="Изменить имя"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = COLORS.accent;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = COLORS.muted;
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {nameError && (
                  <p className="text-sm mt-2" style={{ color: COLORS.error }}>
                    {nameError}
                  </p>
                )}
                {nameSuccess && !isEditingName && (
                  <p className="text-sm mt-2" style={{ color: COLORS.accent }}>
                    {nameSuccess}
                  </p>
                )}

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
