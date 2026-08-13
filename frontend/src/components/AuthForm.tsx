import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Loader2, LogIn, UserPlus } from 'lucide-react';
import { loginUser, registerUser } from '../api/auth';
import { ApiError } from '../api/client';

interface AuthFormProps {
  onSuccess: () => void;
}

export default function AuthForm({ onSuccess }: AuthFormProps) {
  const [rightPanelActive, setRightPanelActive] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [aboutMe, setAboutMe] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formsStageRef = useRef<HTMLDivElement>(null);
  const signInPanelRef = useRef<HTMLDivElement>(null);
  const signUpPanelRef = useRef<HTMLDivElement>(null);

  const isRegister = rightPanelActive;

  useEffect(() => {
    const stage = formsStageRef.current;
    const signInPanel = signInPanelRef.current;
    const signUpPanel = signUpPanelRef.current;
    if (!stage || !signInPanel || !signUpPanel) return;

    const syncHeight = () => {
      if (getComputedStyle(stage).display === 'contents') {
        stage.style.height = '';
        return;
      }
      const activePanel = isRegister ? signUpPanel : signInPanel;
      stage.style.height = `${activePanel.offsetHeight}px`;
    };

    syncHeight();

    const ro = new ResizeObserver(syncHeight);
    ro.observe(signInPanel);
    ro.observe(signUpPanel);
    window.addEventListener('resize', syncHeight);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', syncHeight);
    };
  }, [isRegister, error, info, isSubmitting]);

  function switchToRegister() {
    setRightPanelActive(true);
    setError(null);
    setInfo(null);
  }

  function switchToLogin() {
    setRightPanelActive(false);
    setError(null);
    setInfo(null);
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setIsSubmitting(true);

    try {
      await loginUser({ email: loginEmail, password: loginPassword });
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Не удалось выполнить вход');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setIsSubmitting(true);

    try {
      await registerUser({
        email: registerEmail,
        password: registerPassword,
        about_me: aboutMe,
      });
      setInfo('Аккаунт создан. Войдите с теми же данными.');
      setLoginEmail(registerEmail);
      setLoginPassword('');
      setRegisterPassword('');
      setAboutMe('');
      setRightPanelActive(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Не удалось зарегистрироваться');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className={`auth-container${isRegister ? ' right-panel-active' : ''}`}>
        <div className="auth-mobile-header">
          <h1 className="auth-mobile-brand">AI Aggregator</h1>
          <p key={isRegister ? 'register' : 'login'} className="auth-mobile-lead">
            {isRegister ? 'Создайте аккаунт' : 'Войдите, чтобы продолжить'}
          </p>
          <div className="auth-mobile-tabs" role="tablist" aria-label="Режим входа">
            <button
              type="button"
              role="tab"
              aria-selected={!isRegister}
              className={`auth-mobile-tab${!isRegister ? ' is-active' : ''}`}
              onClick={switchToLogin}
            >
              Вход
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isRegister}
              className={`auth-mobile-tab${isRegister ? ' is-active' : ''}`}
              onClick={switchToRegister}
            >
              Регистрация
            </button>
          </div>
        </div>

        <div className="auth-forms-stage" ref={formsStageRef}>
          <div className="auth-forms-track">
            <div
              ref={signInPanelRef}
              className="auth-form-panel auth-sign-in"
              aria-hidden={isRegister}
            >
              <form className="auth-form" onSubmit={handleLogin}>
                <h2 className="auth-title">Войти</h2>
                <p className="auth-subtitle">Войдите, чтобы продолжить</p>

                <label className="auth-field">
                  <span>Email</span>
                  <input
                    type="email"
                    name="login-email"
                    required={!isRegister}
                    disabled={isRegister || isSubmitting}
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </label>

                <label className="auth-field">
                  <span>Пароль</span>
                  <input
                    type="password"
                    name="login-password"
                    required={!isRegister}
                    disabled={isRegister || isSubmitting}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Ваш пароль"
                    autoComplete="current-password"
                  />
                </label>

                {!isRegister && error && (
                  <p className="auth-message" role="alert" style={{ color: '#f87171' }}>
                    {error}
                  </p>
                )}
                {!isRegister && info && (
                  <p className="auth-message" role="status" style={{ color: '#f5a623' }}>
                    {info}
                  </p>
                )}

                <button
                  type="submit"
                  className="auth-btn auth-btn-primary"
                  disabled={isRegister || isSubmitting}
                >
                  {isSubmitting && !isRegister ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                  Войти
                </button>
              </form>
            </div>

            <div
              ref={signUpPanelRef}
              className="auth-form-panel auth-sign-up"
              aria-hidden={!isRegister}
            >
              <form className="auth-form" onSubmit={handleRegister}>
                <h2 className="auth-title">Создать аккаунт</h2>
                <p className="auth-subtitle">Заполните данные для регистрации</p>

                <label className="auth-field">
                  <span>Email</span>
                  <input
                    type="email"
                    name="register-email"
                    required={isRegister}
                    disabled={!isRegister || isSubmitting}
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </label>

                <label className="auth-field">
                  <span>Пароль</span>
                  <input
                    type="password"
                    name="register-password"
                    required={isRegister}
                    disabled={!isRegister || isSubmitting}
                    minLength={8}
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="Минимум 8 символов"
                    autoComplete="new-password"
                  />
                </label>

                <label className="auth-field">
                  <span>О себе</span>
                  <input
                    type="text"
                    name="register-about"
                    required={isRegister}
                    disabled={!isRegister || isSubmitting}
                    maxLength={20}
                    value={aboutMe}
                    onChange={(e) => setAboutMe(e.target.value)}
                    placeholder="Краткое описание"
                    autoComplete="nickname"
                  />
                </label>

                {isRegister && error && (
                  <p className="auth-message" role="alert" style={{ color: '#f87171' }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="auth-btn auth-btn-primary"
                  disabled={!isRegister || isSubmitting}
                >
                  {isSubmitting && isRegister ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  Зарегистрироваться
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="auth-overlay-container">
          <div className="auth-overlay">
            <div className="auth-overlay-panel auth-overlay-left">
              <h2 className="auth-overlay-title">С возвращением!</h2>
              <p className="auth-overlay-text">Чтобы продолжить, войдите в свой аккаунт</p>
              <button type="button" className="auth-btn auth-btn-ghost" onClick={switchToLogin}>
                Войти
              </button>
            </div>

            <div className="auth-overlay-panel auth-overlay-right">
              <h2 className="auth-overlay-title">Привет!</h2>
              <p className="auth-overlay-text">
                Введите данные и начните работу с AI Aggregator
              </p>
              <button type="button" className="auth-btn auth-btn-ghost" onClick={switchToRegister}>
                Регистрация
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
