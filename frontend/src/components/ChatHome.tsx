import { useState, type FormEvent } from 'react';
import { Loader2, LogOut, MessageSquarePlus, MessagesSquare } from 'lucide-react';
import { createChat } from '../api/chat';
import { ApiError } from '../api/client';
import type { Chat } from '../types/chat';

const COLORS = {
  box: '#2D2D2D',
  border: '#424242',
  card: '#252525',
  accent: '#F5A623',
  accentHover: '#ffb64a',
  text: '#EDEDED',
  muted: '#949494',
  error: '#f87171',
};

interface ChatHomeProps {
  chats: Chat[];
  isLoading: boolean;
  onSelectChat: (chat: Chat) => void;
  onChatCreated: (chat: Chat) => void;
  onLogout: () => void;
  onRefresh: () => void;
}

export default function ChatHome({
  chats,
  isLoading,
  onSelectChat,
  onChatCreated,
  onLogout,
  onRefresh,
}: ChatHomeProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setError(null);
    setIsCreating(true);
    try {
      const chat = await createChat({
        name: trimmedName,
        description: description.trim() || null,
      });
      setName('');
      setDescription('');
      setShowCreate(false);
      onChatCreated(chat);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Не удалось создать чат');
      }
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="w-full min-h-screen bg-black text-white flex flex-col">
      <header
        className="shrink-0 px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${COLORS.border}` }}
      >
        <div>
          <h1 className="text-lg font-semibold" style={{ color: COLORS.text }}>
            Мои чаты
          </h1>
          <p className="text-xs mt-0.5" style={{ color: COLORS.muted }}>
            Создайте чат, чтобы начать общение с ИИ
          </p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl transition-colors"
          style={{ color: COLORS.muted, border: `1px solid ${COLORS.border}` }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = COLORS.text;
            e.currentTarget.style.borderColor = COLORS.accent;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = COLORS.muted;
            e.currentTarget.style.borderColor = COLORS.border;
          }}
        >
          <LogOut className="w-4 h-4" />
          Выйти
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="w-full max-w-2xl mx-auto space-y-4">
          <button
            type="button"
            onClick={() => {
              setShowCreate((prev) => !prev);
              setError(null);
            }}
            className="w-full rounded-2xl p-4 flex items-center gap-3 transition-colors text-left"
            style={{
              background: COLORS.box,
              border: `1px dashed ${COLORS.border}`,
              color: COLORS.text,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = COLORS.accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = COLORS.border;
            }}
          >
            <span
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: '#1f1f1f', color: COLORS.accent }}
            >
              <MessageSquarePlus className="w-5 h-5" />
            </span>
            <span>
              <span className="block text-sm font-medium">Новый чат</span>
              <span className="block text-xs mt-0.5" style={{ color: COLORS.muted }}>
                Задайте название и начните диалог
              </span>
            </span>
          </button>

          {showCreate && (
            <form
              onSubmit={handleCreate}
              className="rounded-2xl p-5 space-y-4"
              style={{ background: COLORS.box, border: `1px solid ${COLORS.border}` }}
            >
              <label className="block">
                <span className="text-xs mb-1.5 block" style={{ color: COLORS.muted }}>
                  Название чата
                </span>
                <input
                  type="text"
                  required
                  maxLength={255}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
                  style={{
                    background: '#1f1f1f',
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.text,
                  }}
                  placeholder="Например, Исследование продукта"
                  autoFocus
                />
              </label>

              <label className="block">
                <span className="text-xs mb-1.5 block" style={{ color: COLORS.muted }}>
                  Описание (необязательно)
                </span>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
                  style={{
                    background: '#1f1f1f',
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.text,
                  }}
                  placeholder="Кратко о теме чата"
                />
              </label>

              {error && (
                <p className="text-sm" style={{ color: COLORS.error }}>
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    setError(null);
                  }}
                  className="flex-1 rounded-2xl py-3 text-sm"
                  style={{ color: COLORS.muted, border: `1px solid ${COLORS.border}` }}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 rounded-2xl py-3 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: COLORS.accent, color: '#1a1a1a' }}
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Создать
                </button>
              </div>
            </form>
          )}

          {isLoading ? (
            <p className="text-center text-sm py-12" style={{ color: COLORS.muted }}>
              Загрузка чатов…
            </p>
          ) : chats.length === 0 ? (
            <p className="text-center text-sm py-12" style={{ color: COLORS.muted }}>
              У вас пока нет чатов. Создайте первый, чтобы начать.
            </p>
          ) : (
            <div className="space-y-3">
              {chats.map((chat) => (
                <button
                  key={chat.chat_id}
                  type="button"
                  onClick={() => onSelectChat(chat)}
                  className="w-full rounded-2xl p-4 flex items-start gap-3 text-left transition-colors"
                  style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = COLORS.accent;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = COLORS.border;
                  }}
                >
                  <span
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: '#1f1f1f', color: COLORS.accent }}
                  >
                    <MessagesSquare className="w-5 h-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium truncate" style={{ color: COLORS.text }}>
                      {chat.name}
                    </span>
                    {chat.description && (
                      <span className="block text-xs mt-1 truncate" style={{ color: COLORS.muted }}>
                        {chat.description}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}

          {!isLoading && chats.length > 0 && (
            <button
              type="button"
              onClick={onRefresh}
              className="w-full text-center text-xs py-2"
              style={{ color: COLORS.muted }}
            >
              Обновить список
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
