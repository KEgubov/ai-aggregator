import { useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react';
import { Loader2, LogOut, MessageSquarePlus, MessagesSquare, Trash2, UserRound, X } from 'lucide-react';
import { createChat, deleteChat } from '../api/chat';
import { ApiError } from '../api/client';
import ConfirmDialog from './ConfirmDialog';
import type { Chat } from '../types/chat';

const COLORS = {
  box: '#2D2D2D',
  border: '#424242',
  card: '#252525',
  menu: '#2f2f2f',
  accent: '#F5A623',
  text: '#EDEDED',
  muted: '#949494',
  error: '#f87171',
  nested: '#1f1f1f',
};

interface SidebarProps {
  isOpen: boolean;
  chats: Chat[];
  isLoading: boolean;
  activeChatId: number | null;
  userInitials: string;
  userLabel: string;
  profileActive: boolean;
  openCreateRequest?: number;
  onClose: () => void;
  onSelectChat: (chat: Chat) => void;
  onChatCreated: (chat: Chat) => void;
  onChatDeleted: (chatId: number) => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  onRefresh: () => void;
  onNewChatHome: () => void;
}

export default function Sidebar({
  isOpen,
  chats,
  isLoading,
  activeChatId,
  userInitials,
  userLabel,
  profileActive,
  openCreateRequest = 0,
  onClose,
  onSelectChat,
  onChatCreated,
  onChatDeleted,
  onOpenProfile,
  onLogout,
  onRefresh,
  onNewChatHome,
}: SidebarProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingChatId, setDeletingChatId] = useState<number | null>(null);
  const [chatToDelete, setChatToDelete] = useState<Chat | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (openCreateRequest > 0) {
      setShowCreate(true);
      setError(null);
    }
  }, [openCreateRequest]);

  useEffect(() => {
    if (!accountMenuOpen) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (target && accountMenuRef.current?.contains(target)) return;
      setAccountMenuOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setAccountMenuOpen(false);
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [accountMenuOpen]);

  useEffect(() => {
    if (!isOpen) setAccountMenuOpen(false);
  }, [isOpen]);

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

  function handleDeleteClick(chat: Chat, event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    setError(null);
    setChatToDelete(chat);
  }

  async function confirmDelete() {
    if (!chatToDelete) return;

    setError(null);
    setDeletingChatId(chatToDelete.chat_id);
    try {
      await deleteChat(chatToDelete.chat_id);
      onChatDeleted(chatToDelete.chat_id);
      setChatToDelete(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Не удалось удалить чат');
      }
    } finally {
      setDeletingChatId(null);
    }
  }

  return (
    <aside
      className={[
        'h-full shrink-0 flex flex-col overflow-hidden',
        'fixed inset-y-0 left-0 z-50 w-[min(280px,85vw)]',
        'transition-[transform,width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
        isOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none',
        'md:static md:z-auto md:translate-x-0',
        isOpen ? 'md:w-[280px]' : 'md:w-0',
      ].join(' ')}
      style={{
        background: COLORS.nested,
        borderRight: isOpen ? `1px solid ${COLORS.border}` : '1px solid transparent',
      }}
      aria-hidden={!isOpen}
    >
      <div className="w-[min(280px,85vw)] md:w-[280px] h-full flex flex-col min-h-0">
      <div className="shrink-0 p-3 space-y-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowCreate(true);
              setError(null);
              onNewChatHome();
            }}
            className="flex-1 min-w-0 rounded-xl px-3 py-2.5 flex items-center gap-2.5 text-left transition-colors"
            style={{
              background: COLORS.box,
              border: `1px solid ${COLORS.border}`,
              color: COLORS.text,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = COLORS.accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = COLORS.border;
            }}
          >
            <MessageSquarePlus className="w-4 h-4 shrink-0" style={{ color: COLORS.accent }} />
            <span className="text-sm font-medium">Новый чат</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-2.5 rounded-xl transition-colors md:hidden"
            style={{
              background: COLORS.box,
              border: `1px solid ${COLORS.border}`,
              color: COLORS.muted,
            }}
            aria-label="Закрыть меню"
            onMouseEnter={(e) => {
              e.currentTarget.style.color = COLORS.text;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = COLORS.muted;
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {showCreate && (
          <form
            onSubmit={handleCreate}
            className="rounded-xl p-3 space-y-3"
            style={{ background: COLORS.box, border: `1px solid ${COLORS.border}` }}
          >
            <label className="block">
              <span className="text-[11px] mb-1 block" style={{ color: COLORS.muted }}>
                Название
              </span>
              <input
                type="text"
                required
                maxLength={255}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{
                  background: COLORS.nested,
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.text,
                }}
                placeholder="Название чата"
                autoFocus
              />
            </label>

            <label className="block">
              <span className="text-[11px] mb-1 block" style={{ color: COLORS.muted }}>
                Описание
              </span>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{
                  background: COLORS.nested,
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.text,
                }}
                placeholder="Необязательно"
              />
            </label>

            {error && (
              <p className="text-xs" style={{ color: COLORS.error }}>
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setError(null);
                }}
                className="flex-1 rounded-lg py-2 text-xs"
                style={{ color: COLORS.muted, border: `1px solid ${COLORS.border}` }}
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="flex-1 rounded-lg py-2 text-xs font-medium flex items-center justify-center gap-1.5 disabled:opacity-60"
                style={{ background: COLORS.accent, color: '#1a1a1a' }}
              >
                {isCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Создать
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-2">
        <p className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide" style={{ color: COLORS.muted }}>
          Чаты
        </p>

        {isLoading ? (
          <p className="px-2 py-6 text-xs text-center" style={{ color: COLORS.muted }}>
            Загрузка…
          </p>
        ) : chats.length === 0 ? (
          <p className="px-2 py-6 text-xs text-center" style={{ color: COLORS.muted }}>
            Пока нет чатов
          </p>
        ) : (
          <div className="space-y-0.5">
            {chats.map((chat) => {
              const isActive = activeChatId === chat.chat_id;
              return (
                <div
                  key={chat.chat_id}
                  className="group relative flex items-center rounded-lg"
                  style={{
                    background: isActive ? COLORS.box : 'transparent',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onSelectChat(chat)}
                    className="flex-1 min-w-0 px-2.5 py-2 flex items-center gap-2.5 text-left rounded-lg"
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.parentElement!.style.background = COLORS.card;
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.parentElement!.style.background = 'transparent';
                    }}
                  >
                    <MessagesSquare
                      className="w-4 h-4 shrink-0"
                      style={{ color: isActive ? COLORS.accent : COLORS.muted }}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className="block text-sm truncate"
                        style={{ color: isActive ? COLORS.text : COLORS.text }}
                      >
                        {chat.name}
                      </span>
                      {chat.description && (
                        <span className="block text-[11px] mt-0.5 truncate" style={{ color: COLORS.muted }}>
                          {chat.description}
                        </span>
                      )}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={(event) => handleDeleteClick(chat, event)}
                    disabled={deletingChatId === chat.chat_id}
                    className="shrink-0 mr-1.5 p-1.5 rounded-md opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity disabled:opacity-50"
                    style={{ color: COLORS.muted }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = COLORS.error;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = COLORS.muted;
                    }}
                    aria-label={`Удалить чат ${chat.name}`}
                  >
                    {deletingChatId === chat.chat_id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {error && !showCreate && (
          <p className="px-2 pt-2 text-xs text-center" style={{ color: COLORS.error }}>
            {error}
          </p>
        )}

        {!isLoading && chats.length > 0 && (
          <button
            type="button"
            onClick={onRefresh}
            className="w-full text-center text-[11px] py-2 mt-1"
            style={{ color: COLORS.muted }}
          >
            Обновить список
          </button>
        )}
      </div>

      <div
        ref={accountMenuRef}
        className="shrink-0 p-2 relative"
        style={{ borderTop: `1px solid ${COLORS.border}` }}
      >
        {accountMenuOpen && (
          <div
            role="menu"
            aria-label="Меню аккаунта"
            className="absolute left-2 right-2 bottom-[calc(100%+6px)] rounded-2xl py-1.5 shadow-2xl z-20 overflow-hidden"
            style={{
              background: COLORS.menu,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setAccountMenuOpen(false);
                onOpenProfile();
              }}
              className="w-full px-3 py-2.5 flex items-center gap-3 text-left transition-colors"
              style={{ color: COLORS.text }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = COLORS.card;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <UserRound className="w-4 h-4 shrink-0" style={{ color: COLORS.muted }} />
              <span className="text-sm">Профиль</span>
            </button>
            <div className="mx-2 my-1 h-px" style={{ background: COLORS.border }} />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setAccountMenuOpen(false);
                onLogout();
              }}
              className="w-full px-3 py-2.5 flex items-center gap-3 text-left transition-colors"
              style={{ color: COLORS.text }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = COLORS.card;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <LogOut className="w-4 h-4 shrink-0" style={{ color: COLORS.muted }} />
              <span className="text-sm">Выйти</span>
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setAccountMenuOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={accountMenuOpen}
          className="w-full rounded-xl px-2.5 py-2.5 flex items-center gap-2.5 text-left transition-colors"
          style={{
            background: accountMenuOpen || profileActive ? COLORS.box : 'transparent',
            border: `1px solid ${profileActive ? COLORS.accent : 'transparent'}`,
          }}
          onMouseEnter={(e) => {
            if (!accountMenuOpen && !profileActive) e.currentTarget.style.background = COLORS.card;
          }}
          onMouseLeave={(e) => {
            if (!accountMenuOpen && !profileActive) e.currentTarget.style.background = 'transparent';
          }}
        >
          <span
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
            style={{
              background: COLORS.box,
              color: COLORS.accent,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            {userInitials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm truncate" style={{ color: COLORS.text }}>
              {userLabel}
            </span>
            <span className="block text-[11px] mt-0.5" style={{ color: COLORS.muted }}>
              Аккаунт
            </span>
          </span>
        </button>
      </div>

      <ConfirmDialog
        open={chatToDelete !== null}
        title="Удалить чат?"
        description={
          chatToDelete
            ? `Чат «${chatToDelete.name}» и все сообщения в нём будут удалены без возможности восстановления.`
            : ''
        }
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        variant="danger"
        isLoading={deletingChatId !== null}
        onConfirm={() => void confirmDelete()}
        onCancel={() => {
          if (deletingChatId === null) {
            setChatToDelete(null);
          }
        }}
      />
      </div>
    </aside>
  );
}
