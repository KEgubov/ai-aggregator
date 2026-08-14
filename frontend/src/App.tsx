import { useCallback, useEffect, useState } from 'react';
import AuthForm from './components/AuthForm';
import ChatHome from './components/ChatHome';
import ChatView from './components/ChatView';
import ProfileModal from './components/ProfileModal';
import Sidebar from './components/Sidebar';
import { fetchProfile, logoutUser } from './api/auth';
import { createChat, fetchChats, joinChat } from './api/chat';
import { ApiError } from './api/client';
import type { Chat } from './types/chat';
import { initialsFromName } from './types/user';
import { startViewTransition, supportsViewTransition } from './utils/viewTransition';

type AppView = 'loading' | 'auth' | 'chats' | 'conversation';

const LOGOUT_FLAG = 'agregation_logged_out';
const PENDING_JOIN_TOKEN = 'agregation_pending_join';
const DEFAULT_INITIALS = 'Я';
const DEFAULT_LABEL = 'Пользователь';
const DESKTOP_MQ = '(min-width: 768px)';
const AUTH_ENTER_CLASS = 'vt-auth-enter';

function isDesktopViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(DESKTOP_MQ).matches;
}

/** Достаёт token из /join/<token>, иначе null. */
function readJoinTokenFromPath(): string | null {
  const match = window.location.pathname.match(/^\/join\/([^/]+)\/?$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function clearJoinPath() {
  if (window.location.pathname.startsWith('/join/')) {
    window.history.replaceState(null, '', '/');
  }
}

export default function App() {
  const [view, setView] = useState<AppView>('loading');
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [userInitials, setUserInitials] = useState(DEFAULT_INITIALS);
  const [userLabel, setUserLabel] = useState(DEFAULT_LABEL);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => isDesktopViewport());
  const [profileOpen, setProfileOpen] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [shellEnter, setShellEnter] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const profile = await fetchProfile();
      setCurrentUserId(profile.user_id);
      setUserInitials(initialsFromName(profile.username));
      setUserLabel(profile.username || DEFAULT_LABEL);
    } catch {
      setCurrentUserId(null);
      setUserInitials(DEFAULT_INITIALS);
      setUserLabel(DEFAULT_LABEL);
    }
  }, []);

  const loadChats = useCallback(async (): Promise<boolean> => {
    setIsLoadingChats(true);
    try {
      const list = await fetchChats();
      setChats(list);
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        return false;
      }
      setChats([]);
      return true;
    } finally {
      setIsLoadingChats(false);
    }
  }, []);

  const closeSidebarOnMobile = useCallback(() => {
    if (!isDesktopViewport()) {
      setSidebarOpen(false);
    }
  }, []);

  const acceptInvite = useCallback(
    async (token: string): Promise<boolean> => {
      setJoinError(null);
      try {
        const chat = await joinChat(token);
        sessionStorage.removeItem(PENDING_JOIN_TOKEN);
        clearJoinPath();
        setChats((prev) => {
          if (prev.some((c) => c.chat_id === chat.chat_id)) return prev;
          return [chat, ...prev];
        });
        startViewTransition(() => {
          setActiveChat(chat);
          setView('conversation');
          closeSidebarOnMobile();
        });
        return true;
      } catch (err) {
        sessionStorage.removeItem(PENDING_JOIN_TOKEN);
        clearJoinPath();
        setJoinError(err instanceof Error ? err.message : 'Не удалось присоединиться к чату');
        return false;
      }
    },
    [closeSidebarOnMobile],
  );

  const bootstrap = useCallback(async () => {
    const pathToken = readJoinTokenFromPath();
    if (pathToken) {
      sessionStorage.setItem(PENDING_JOIN_TOKEN, pathToken);
    }

    if (sessionStorage.getItem(LOGOUT_FLAG)) {
      setView('auth');
      return;
    }

    const isAuthenticated = await loadChats();
    if (isAuthenticated) {
      await loadProfile();
      const pending = sessionStorage.getItem(PENDING_JOIN_TOKEN) ?? pathToken;
      if (pending) {
        const ok = await acceptInvite(pending);
        if (!ok) setView('chats');
        return;
      }
      setView('chats');
    } else {
      setView('auth');
    }
  }, [acceptInvite, loadChats, loadProfile]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const onChange = (event: MediaQueryListEvent) => {
      setSidebarOpen(event.matches);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const revealApp = useCallback((update: () => void) => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!supportsViewTransition() && !reduceMotion) {
      setShellEnter(true);
    }
    startViewTransition(update, { className: AUTH_ENTER_CLASS });
  }, []);

  const handleAuthSuccess = useCallback(async () => {
    sessionStorage.removeItem(LOGOUT_FLAG);
    await Promise.all([loadChats(), loadProfile()]);
    setSidebarOpen(isDesktopViewport());

    const pending = sessionStorage.getItem(PENDING_JOIN_TOKEN) ?? readJoinTokenFromPath();
    if (pending) {
      setJoinError(null);
      try {
        const chat = await joinChat(pending);
        sessionStorage.removeItem(PENDING_JOIN_TOKEN);
        clearJoinPath();
        setChats((prev) => {
          if (prev.some((c) => c.chat_id === chat.chat_id)) return prev;
          return [chat, ...prev];
        });
        revealApp(() => {
          setActiveChat(chat);
          setView('conversation');
          closeSidebarOnMobile();
        });
      } catch (err) {
        sessionStorage.removeItem(PENDING_JOIN_TOKEN);
        clearJoinPath();
        setJoinError(err instanceof Error ? err.message : 'Не удалось присоединиться к чату');
        revealApp(() => setView('chats'));
      }
      return;
    }

    revealApp(() => setView('chats'));
  }, [closeSidebarOnMobile, loadChats, loadProfile, revealApp]);

  const handleLogout = useCallback(async () => {
    try {
      await logoutUser();
    } catch {
      // Сбрасываем UI даже при ошибке сети
    }
    sessionStorage.setItem(LOGOUT_FLAG, '1');
    setChats([]);
    setActiveChat(null);
    setUserInitials(DEFAULT_INITIALS);
    setUserLabel(DEFAULT_LABEL);
    setCurrentUserId(null);
    setProfileOpen(false);
    setJoinError(null);
    setView('auth');
  }, []);

  const handleSelectChat = useCallback(
    (chat: Chat) => {
      startViewTransition(() => {
        setActiveChat(chat);
        setView('conversation');
        closeSidebarOnMobile();
      });
    },
    [closeSidebarOnMobile],
  );

  const handleChatCreated = useCallback(
    (chat: Chat) => {
      startViewTransition(() => {
        setChats((prev) => [chat, ...prev]);
        setActiveChat(chat);
        setView('conversation');
        closeSidebarOnMobile();
      });
    },
    [closeSidebarOnMobile],
  );

  const handleChatDeleted = useCallback(
    (chatId: number) => {
      const wasActive = activeChat?.chat_id === chatId;
      const update = () => {
        setChats((prev) => prev.filter((chat) => chat.chat_id !== chatId));
        if (wasActive) {
          setActiveChat(null);
          setView('chats');
        }
      };
      if (wasActive) startViewTransition(update);
      else update();
    },
    [activeChat?.chat_id],
  );

  const handleChatRenamed = useCallback((chat: Chat) => {
    setChats((prev) =>
      prev.map((item) => (item.chat_id === chat.chat_id ? chat : item)),
    );
    setActiveChat((prev) => (prev?.chat_id === chat.chat_id ? chat : prev));
  }, []);

  const handleOpenProfile = useCallback(() => {
    setProfileOpen(true);
    closeSidebarOnMobile();
  }, [closeSidebarOnMobile]);

  const handleStartNewChat = useCallback(async () => {
    if (isCreatingChat) return;
    setIsCreatingChat(true);
    setJoinError(null);
    try {
      const chat = await createChat();
      handleChatCreated(chat);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Не удалось создать чат');
    } finally {
      setIsCreatingChat(false);
    }
  }, [handleChatCreated, isCreatingChat]);

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen((open) => !open);
  }, []);

  if (view === 'loading') {
    return (
      <div className="w-full min-h-dvh bg-black text-white flex items-center justify-center">
        <p className="text-sm" style={{ color: '#949494' }}>
          Загрузка…
        </p>
      </div>
    );
  }

  if (view === 'auth') {
    return <AuthForm onSuccess={handleAuthSuccess} />;
  }

  return (
    <div
      className={[
        'app-shell w-full h-dvh bg-black text-white flex overflow-hidden relative',
        shellEnter ? 'app-shell-enter' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget && event.animationName === 'app-shell-in') {
          setShellEnter(false);
        }
      }}
    >
      <button
        type="button"
        aria-label="Закрыть меню"
        tabIndex={sidebarOpen ? 0 : -1}
        className={[
          'fixed inset-0 z-40 bg-black/60 md:hidden',
          'transition-opacity duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={() => setSidebarOpen(false)}
      />
      <Sidebar
        isOpen={sidebarOpen}
        chats={chats}
        isLoading={isLoadingChats}
        activeChatId={activeChat?.chat_id ?? null}
        userInitials={userInitials}
        userLabel={userLabel}
        profileActive={profileOpen}
        onClose={() => setSidebarOpen(false)}
        onSelectChat={handleSelectChat}
        onChatCreated={handleChatCreated}
        onChatDeleted={handleChatDeleted}
        onOpenProfile={handleOpenProfile}
        onLogout={() => void handleLogout()}
        onRefresh={() => void loadChats()}
      />
      <main className="flex-1 min-w-0 h-full relative">
        {joinError && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 max-w-[min(90%,24rem)]">
            <div
              className="rounded-lg px-3 py-2 text-xs shadow-lg flex items-start gap-2"
              style={{ background: '#252525', border: '1px solid #424242', color: '#f87171' }}
            >
              <span className="flex-1 min-w-0 break-words">{joinError}</span>
              <button
                type="button"
                className="shrink-0 text-[#949494] hover:text-[#EDEDED]"
                aria-label="Закрыть"
                onClick={() => setJoinError(null)}
              >
                ×
              </button>
            </div>
          </div>
        )}
        <div className="chat-main-surface">
          {view === 'conversation' && activeChat ? (
            <ChatView
              key={activeChat.chat_id}
              chat={activeChat}
              currentUserId={currentUserId}
              userInitials={userInitials}
              userLabel={userLabel}
              onToggleSidebar={handleToggleSidebar}
              onChatRenamed={handleChatRenamed}
            />
          ) : (
            <ChatHome
              onStartNewChat={() => void handleStartNewChat()}
              isCreating={isCreatingChat}
              onToggleSidebar={handleToggleSidebar}
            />
          )}
        </div>
      </main>

      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        onUsernameChange={(username) => {
          setUserLabel(username || DEFAULT_LABEL);
          setUserInitials(initialsFromName(username));
        }}
      />
    </div>
  );
}
