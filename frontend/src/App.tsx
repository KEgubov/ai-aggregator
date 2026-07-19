import { useCallback, useEffect, useState } from 'react';
import AuthForm from './components/AuthForm';
import ChatHome from './components/ChatHome';
import ChatView from './components/ChatView';
import { logoutUser } from './api/auth';
import { fetchChats } from './api/chat';
import { ApiError } from './api/client';
import type { Chat } from './types/chat';

type AppView = 'loading' | 'auth' | 'chats' | 'conversation';

const LOGOUT_FLAG = 'agregation_logged_out';

export default function App() {
  const [view, setView] = useState<AppView>('loading');
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [isLoadingChats, setIsLoadingChats] = useState(false);

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
    setView(isAuthenticated ? 'chats' : 'auth');
  }, [loadChats]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const handleAuthSuccess = useCallback(async () => {
    sessionStorage.removeItem(LOGOUT_FLAG);
    await loadChats();
    setView('chats');
  }, [loadChats]);

  const handleLogout = useCallback(async () => {
    try {
      await logoutUser();
    } catch {
      // Сбрасываем UI даже при ошибке сети
    }
    sessionStorage.setItem(LOGOUT_FLAG, '1');
    setChats([]);
    setActiveChat(null);
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
    return <ChatView chat={activeChat} onBack={handleBackToChats} />;
  }

  return (
    <ChatHome
      chats={chats}
      isLoading={isLoadingChats}
      onSelectChat={handleSelectChat}
      onChatCreated={handleChatCreated}
      onChatDeleted={handleChatDeleted}
      onLogout={handleLogout}
      onRefresh={() => void loadChats()}
    />
  );
}
