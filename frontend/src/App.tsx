import { useCallback, useEffect, useState } from 'react';
import AuthForm from './components/AuthForm';
import ChatHome from './components/ChatHome';
import ChatView from './components/ChatView';
import ProfilePage from './components/ProfilePage';
import { fetchProfile, logoutUser } from './api/auth';
import { fetchChats } from './api/chat';
import { ApiError } from './api/client';
import type { Chat } from './types/chat';
import { initialsFromEmail } from './types/user';

type AppView = 'loading' | 'auth' | 'chats' | 'conversation' | 'profile';

const LOGOUT_FLAG = 'agregation_logged_out';
const DEFAULT_INITIALS = 'Я';

export default function App() {
  const [view, setView] = useState<AppView>('loading');
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  const [userInitials, setUserInitials] = useState(DEFAULT_INITIALS);

  const loadProfile = useCallback(async () => {
    try {
      const profile = await fetchProfile();
      setUserInitials(initialsFromEmail(profile.email));
    } catch {
      setUserInitials(DEFAULT_INITIALS);
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

  const handleAuthSuccess = useCallback(async () => {
    sessionStorage.removeItem(LOGOUT_FLAG);
    await Promise.all([loadChats(), loadProfile()]);
    setView('chats');
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
    setView('auth');
  }, []);

  const handleSelectChat = useCallback((chat: Chat) => {
    setActiveChat(chat);
    setView('conversation');
  }, []);

  const handleChatCreated = useCallback((chat: Chat) => {
    setChats((prev) => [chat, ...prev]);
    setActiveChat(chat);
    setView('conversation');
  }, []);

  const handleChatDeleted = useCallback((chatId: number) => {
    setChats((prev) => prev.filter((chat) => chat.chat_id !== chatId));
    setActiveChat((prev) => (prev?.chat_id === chatId ? null : prev));
    setView((currentView) =>
      currentView === 'conversation' && activeChat?.chat_id === chatId ? 'chats' : currentView,
    );
  }, [activeChat]);

  const handleBackToChats = useCallback(() => {
    setActiveChat(null);
    setView('chats');
  }, []);

  const handleOpenProfile = useCallback(() => {
    setView('profile');
  }, []);

  if (view === 'loading') {
    return (
      <div className="w-full min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-sm" style={{ color: '#949494' }}>
          Загрузка…
        </p>
      </div>
    );
  }

  if (view === 'auth') {
    return <AuthForm onSuccess={handleAuthSuccess} />;
  }

  if (view === 'conversation' && activeChat) {
    return (
      <ChatView chat={activeChat} onBack={handleBackToChats} userInitials={userInitials} />
    );
  }

  if (view === 'profile') {
    return <ProfilePage onBack={handleBackToChats} onLogout={handleLogout} />;
  }

  return (
    <ChatHome
      chats={chats}
      isLoading={isLoadingChats}
      onSelectChat={handleSelectChat}
      onChatCreated={handleChatCreated}
      onChatDeleted={handleChatDeleted}
      onLogout={handleLogout}
      onOpenProfile={handleOpenProfile}
      onRefresh={() => void loadChats()}
    />
  );
}
