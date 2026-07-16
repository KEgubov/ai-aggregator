import { useState, type FormEvent } from 'react';
import { Loader2, LogIn, UserPlus } from 'lucide-react';
import { loginUser, registerUser } from '../api/auth';
import { ApiError } from '../api/client';

const COLORS = {
  box: '#2D2D2D',
  border: '#424242',
  accent: '#F5A623',
  accentHover: '#ffb64a',
  text: '#EDEDED',
  muted: '#949494',
  error: '#f87171',
};

type AuthMode = 'login' | 'register';

interface AuthFormProps {
  onSuccess: () => void;
}

export default function AuthForm({ onSuccess }: AuthFormProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [aboutMe, setAboutMe] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setIsSubmitting(true);

    try {
      if (mode === 'register') {
        await registerUser({ email, password, about_me: aboutMe });
        setInfo('Аккаунт создан. Войдите с теми же данными.');
        setMode('login');
        setPassword('');
        setAboutMe('');
      } else {
        await loginUser({ email, password });
        onSuccess();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Не удалось выполнить запрос');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div
        className="w-full max-w-md rounded-3xl p-8"
        style={{ background: COLORS.box, border: `1px solid ${COLORS.border}` }}
      >
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold mb-2" style={{ color: COLORS.text }}>
            AI Aggregator
          </h1>
          <p className="text-sm" style={{ color: COLORS.muted }}>
            {mode === 'login' ? 'Войдите, чтобы продолжить' : 'Создайте аккаунт'}
          </p>
        </div>

        <div
          className="flex rounded-2xl p-1 mb-6"
          style={{ background: '#1f1f1f', border: `1px solid ${COLORS.border}` }}
        >
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
              setInfo(null);
            }}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{
              background: mode === 'login' ? COLORS.accent : 'transparent',
              color: mode === 'login' ? '#1a1a1a' : COLORS.muted,
            }}
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
              setInfo(null);
            }}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{
              background: mode === 'register' ? COLORS.accent : 'transparent',
              color: mode === 'register' ? '#1a1a1a' : COLORS.muted,
            }}
          >
            Регистрация
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-xs mb-1.5 block" style={{ color: COLORS.muted }}>
              Email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
              style={{
                background: '#1f1f1f',
                border: `1px solid ${COLORS.border}`,
                color: COLORS.text,
              }}
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="text-xs mb-1.5 block" style={{ color: COLORS.muted }}>
              Пароль
            </span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
              style={{
                background: '#1f1f1f',
                border: `1px solid ${COLORS.border}`,
                color: COLORS.text,
              }}
              placeholder="Минимум 8 символов"
            />
          </label>

          {mode === 'register' && (
            <label className="block">
              <span className="text-xs mb-1.5 block" style={{ color: COLORS.muted }}>
                О себе
              </span>
              <input
                type="text"
                required
                maxLength={20}
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value)}
                className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
                style={{
                  background: '#1f1f1f',
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.text,
                }}
                placeholder="Краткое описание"
              />
            </label>
          )}

          {error && (
            <p className="text-sm text-center" style={{ color: COLORS.error }}>
              {error}
            </p>
          )}
          {info && (
            <p className="text-sm text-center" style={{ color: COLORS.accent }}>
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            style={{ background: COLORS.accent, color: '#1a1a1a' }}
            onMouseEnter={(e) => {
              if (!isSubmitting) e.currentTarget.style.background = COLORS.accentHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = COLORS.accent;
            }}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === 'login' ? (
              <LogIn className="w-4 h-4" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            {mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>
      </div>
    </div>
  );
}
