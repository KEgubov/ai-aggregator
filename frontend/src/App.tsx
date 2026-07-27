import { useCallback, useEffect, useState } from 'react';
import AuthForm from './components/AuthForm';
import ChatHome from './components/ChatHome';
import ChatView from './components/ChatView';
import ProfilePage from './components/ProfilePage';
import Sidebar from './components/Sidebar';
import { fetchProfile, logoutUser } from './api/auth';
import { fetchChats } from './api/chat';
import { ApiError } from './api/client';
import type { Chat } from './types/chat';
import { initialsFromEmail } from './types/user';

type AppView = 'loading' | 'auth' | 'chats' | 'conversation' | 'profile';

const LOGOUT_FLAG = 'agregation_logged_out';
const DEFAULT_INITIALS = 'Я';
const DEFAULT_LABEL = 'Пользователь';
const DESKTOP_MQ = '(min-width: 768px)';

function isDesktopViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(DESKTOP_MQ).matches;
}

export default function App() {
  const [view, setView] = useState<AppView>('loading');
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [userInitials, setUserInitials] = useState(DEFAULT_INITIALS);
  const [userLabel, setUserLabel] = useState(DEFAULT_LABEL);
  const [openCreateRequest, setOpenCreateRequest] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(() => isDesktopViewport());

  const loadProfile = useCallback(async () => {
    try {
      const profile = await fetchProfile();
      setUserInitials(initialsFromEmail(profile.email));
      setUserLabel(profile.email.split('@')[0] || DEFAULT_LABEL);
    } catch {
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

  const bootstrap = useCallback(async () => {
    if (sessionStorage.getItem(LOGOUT_FLAG)) {
      setView('auth');
      return;
    }
    const isAuthenticated = await loadChats();
    if (isAuthenticated) {
      await loadProfile();
      setView('chats');
    } else {
      setView('auth');
    }
  }, [loadChats, loadProfile]);

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

  const closeSidebarOnMobile = useCallback(() => {
    if (!isDesktopViewport()) {
      setSidebarOpen(false);
    }
  }, []);

  const handleAuthSuccess = useCallback(async () => {
    sessionStorage.removeItem(LOGOUT_FLAG);
    await Promise.all([loadChats(), loadProfile()]);
    setView('chats');
    setSidebarOpen(isDesktopViewport());
  }, [loadChats, loadProfile]);

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
    setView('auth');
  }, []);

  const handleSelectChat = useCallback(
    (chat: Chat) => {
      setActiveChat(chat);
      setView('conversation');
      closeSidebarOnMobile();
    },
    [closeSidebarOnMobile],
  );

  const handleChatCreated = useCallback(
    (chat: Chat) => {
      setChats((prev) => [chat, ...prev]);
      setActiveChat(chat);
      setView('conversation');
      closeSidebarOnMobile();
    },
    [closeSidebarOnMobile],
  );

  const handleChatDeleted = useCallback(
    (chatId: number) => {
      setChats((prev) => prev.filter((chat) => chat.chat_id !== chatId));
      setActiveChat((prev) => {
        if (prev?.chat_id === chatId) {
          setView('chats');
          return null;
        }
        return prev;
      });
    },
    [],
  );

  const handleBackToChats = useCallback(() => {
    setActiveChat(null);
    setView('chats');
  }, []);

  const handleOpenProfile = useCallback(() => {
    setView('profile');
    closeSidebarOnMobile();
  }, [closeSidebarOnMobile]);

  const handleStartNewChat = useCallback(() => {
    setOpenCreateRequest((n) => n + 1);
    setActiveChat(null);
    setView('chats');
    setSidebarOpen(true);
  }, []);

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
    <div className="w-full h-dvh bg-black text-white flex overflow-hidden relative">
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
        profileActive={view === 'profile'}
        openCreateRequest={openCreateRequest}
        onClose={() => setSidebarOpen(false)}
        onSelectChat={handleSelectChat}
        onChatCreated={handleChatCreated}
        onChatDeleted={handleChatDeleted}
        onOpenProfile={handleOpenProfile}
        onLogout={() => void handleLogout()}
        onRefresh={() => void loadChats()}
        onNewChatHome={handleBackToChats}
      />
      <main className="flex-1 min-w-0 h-full">
        {view === 'conversation' && activeChat ? (
          <ChatView
            chat={activeChat}
            userInitials={userInitials}
            onToggleSidebar={handleToggleSidebar}
          />
        ) : view === 'profile' ? (
          <ProfilePage onToggleSidebar={handleToggleSidebar} />
        ) : (
          <ChatHome onStartNewChat={handleStartNewChat} onToggleSidebar={handleToggleSidebar} />
        )}
      </main>
    </div>
  );
}
