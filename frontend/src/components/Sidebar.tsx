import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import {
  Loader2,
  LogOut,
  MessageSquare,
  MessageSquarePlus,
  MessagesSquare,
  PanelLeft,
  Sparkles,
  Trash2,
  UserRound,
} from 'lucide-react';
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

/** Keep in sync with `.chat-list-item-exit` in index.css */
const CHAT_ITEM_EXIT_MS = 180;
const DESKTOP_MQ = '(min-width: 768px)';

interface SidebarProps {
  isOpen: boolean;
  chats: Chat[];
  isLoading: boolean;
  activeChatId: number | null;
  userInitials: string;
  userLabel: string;
  profileActive: boolean;
  onClose: () => void;
  onOpen: () => void;
  onGoHome: () => void;
  onSelectChat: (chat: Chat) => void;
  onChatCreated: (chat: Chat) => void;
  onChatDeleted: (chatId: number) => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  onRefresh: () => void;
}

function RailTip({ children }: { children: ReactNode }) {
  return (
    <span className="sidebar-rail-tip">
      <span className="sidebar-rail-tip-inner">{children}</span>
    </span>
  );
}

export default function Sidebar({
  isOpen,
  chats,
  isLoading,
  activeChatId,
  userInitials,
  userLabel,
  profileActive,
  onClose,
  onOpen,
  onGoHome,
  onSelectChat,
  onChatCreated,
  onChatDeleted,
  onOpenProfile,
  onLogout,
  onRefresh,
}: SidebarProps) {
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingChatId, setDeletingChatId] = useState<number | null>(null);
  const [exitingChatId, setExitingChatId] = useState<number | null>(null);
  const [chatToDelete, setChatToDelete] = useState<Chat | null>(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(DESKTOP_MQ).matches,
  );
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const recentRef = useRef<HTMLDivElement>(null);
  const knownChatIdsRef = useRef<Set<number> | null>(null);

  if (knownChatIdsRef.current === null) {
    knownChatIdsRef.current = new Set(chats.map((chat) => chat.chat_id));
  }

  useEffect(() => {
    const known = knownChatIdsRef.current;
    if (!known) return;
    const currentIds = new Set(chats.map((chat) => chat.chat_id));
    for (const id of [...known]) {
      if (!currentIds.has(id)) known.delete(id);
    }
  }, [chats]);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!accountMenuOpen && !recentOpen) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (target && accountMenuRef.current?.contains(target)) return;
      if (target && recentRef.current?.contains(target)) return;
      setAccountMenuOpen(false);
      setRecentOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setAccountMenuOpen(false);
        setRecentOpen(false);
      }
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [accountMenuOpen, recentOpen]);

  useEffect(() => {
    if (isOpen) {
      setAccountMenuOpen(false);
      setRecentOpen(false);
    }
  }, [isOpen]);

  async function handleCreate() {
    if (isCreating) return;

    setError(null);
    setIsCreating(true);
    try {
      const chat = await createChat();
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

    const deletedId = chatToDelete.chat_id;
    setError(null);
    setDeletingChatId(deletedId);
    try {
      await deleteChat(deletedId);
      setChatToDelete(null);
      setExitingChatId(deletedId);
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, CHAT_ITEM_EXIT_MS);
      });
      onChatDeleted(deletedId);
      setExitingChatId(null);
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

  const showExpanded = isOpen || !isDesktop;
  const hiddenFromA11y = !isOpen && !isDesktop;

  return (
    <aside
      className={[
        'h-full shrink-0 flex flex-col',
        'fixed inset-y-0 left-0 z-50 w-[min(280px,85vw)]',
        'transition-[transform,width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
        isOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none',
        'md:relative md:z-40 md:translate-x-0 md:pointer-events-auto',
        isOpen ? 'md:w-[280px] md:overflow-hidden' : 'md:w-[52px] md:overflow-visible',
      ].join(' ')}
      style={{
        background: COLORS.nested,
        borderRight: `1px solid ${isOpen || isDesktop ? COLORS.border : 'transparent'}`,
      }}
      aria-hidden={hiddenFromA11y}
    >
      {showExpanded ? (
        <div className="w-[min(280px,85vw)] md:w-[280px] h-full flex flex-col min-h-0 overflow-hidden">
          <div className="shrink-0 p-2 pb-1">
            <div className="flex items-center gap-0.5 min-w-0">
              <button
                type="button"
                onClick={onGoHome}
                className="sidebar-brand flex-1 min-w-0 px-2 py-2 text-left"
                aria-label="На главную"
                title="На главную"
              >
                <span
                  className="block text-[15px] font-semibold tracking-tight truncate"
                  style={{ color: COLORS.text }}
                >
                  AI Aggregator
                </span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 p-2 rounded-lg transition-colors"
                style={{ color: COLORS.muted }}
                aria-label="Закрыть боковую панель"
                title="Закрыть боковую панель"
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = COLORS.text;
                  e.currentTarget.style.background = COLORS.card;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = COLORS.muted;
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <PanelLeft className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="shrink-0 px-3 pb-2">
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={isCreating}
              className="w-full rounded-xl px-3 py-2.5 flex items-center gap-2.5 text-left transition-colors disabled:opacity-60"
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
              {isCreating ? (
                <Loader2 className="w-4 h-4 shrink-0 animate-spin" style={{ color: COLORS.accent }} />
              ) : (
                <MessageSquarePlus className="w-4 h-4 shrink-0" style={{ color: COLORS.accent }} />
              )}
              <span className="text-sm font-medium">Новый чат</span>
            </button>
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
                  const isExiting = exitingChatId === chat.chat_id;
                  const isNew = !knownChatIdsRef.current?.has(chat.chat_id);
                  return (
                    <div
                      key={chat.chat_id}
                      className={[
                        'group relative flex items-center rounded-lg overflow-hidden',
                        isNew ? 'chat-list-item' : '',
                        isExiting ? 'chat-list-item-exit' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
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

            {error && (
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
              <div className="absolute left-2 right-2 bottom-[calc(100%+6px)] z-20">
                <AccountMenu
                  onOpenProfile={() => {
                    setAccountMenuOpen(false);
                    onOpenProfile();
                  }}
                  onLogout={() => {
                    setAccountMenuOpen(false);
                    onLogout();
                  }}
                />
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
        </div>
      ) : (
        <div className="sidebar-rail">
          <button
            type="button"
            className="sidebar-rail-item group"
            onClick={onOpen}
            aria-label="Открыть боковую панель"
          >
            <Sparkles className="w-5 h-5 group-hover:hidden group-focus-visible:hidden" />
            <PanelLeft className="w-5 h-5 hidden group-hover:block group-focus-visible:block" />
            <RailTip>Открыть боковую панель</RailTip>
          </button>

          <div ref={recentRef} className="relative">
            <button
              type="button"
              className={['sidebar-rail-item group', recentOpen ? 'is-open' : ''].filter(Boolean).join(' ')}
              onClick={() => {
                setAccountMenuOpen(false);
                setRecentOpen((open) => !open);
              }}
              aria-haspopup="menu"
              aria-expanded={recentOpen}
              aria-label="Недавние чаты"
            >
              <MessageSquare className="w-5 h-5" />
              {!recentOpen && <RailTip>Недавние чаты</RailTip>}
            </button>

            {recentOpen && (
              <div
                role="menu"
                aria-label="Недавние чаты"
                className="sidebar-recent-pop"
              >
                <p className="px-3 py-2 text-[13px]" style={{ color: COLORS.muted }}>
                  Недавние чаты
                </p>
                {isLoading ? (
                  <p className="px-3 py-4 text-xs" style={{ color: COLORS.muted }}>
                    Загрузка…
                  </p>
                ) : chats.length === 0 ? (
                  <p className="px-3 py-4 text-xs" style={{ color: COLORS.muted }}>
                    Пока нет чатов
                  </p>
                ) : (
                  <div className="pb-1.5">
                    {chats.map((chat) => {
                      const isActive = activeChatId === chat.chat_id;
                      return (
                        <button
                          key={chat.chat_id}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setRecentOpen(false);
                            onSelectChat(chat);
                          }}
                          className="w-full px-3 py-2 text-left text-sm truncate transition-colors"
                          style={{
                            color: COLORS.text,
                            background: isActive ? COLORS.card : 'transparent',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = COLORS.card;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = isActive ? COLORS.card : 'transparent';
                          }}
                        >
                          {chat.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 min-h-2" />

          <div ref={accountMenuRef} className="relative pb-1">
            {accountMenuOpen && (
              <div className="sidebar-rail-account-pop">
                <AccountMenu
                  onOpenProfile={() => {
                    setAccountMenuOpen(false);
                    onOpenProfile();
                  }}
                  onLogout={() => {
                    setAccountMenuOpen(false);
                    onLogout();
                  }}
                />
              </div>
            )}
            <button
              type="button"
              className={['sidebar-rail-item group', accountMenuOpen || profileActive ? 'is-open' : ''].filter(Boolean).join(' ')}
              onClick={() => {
                setRecentOpen(false);
                setAccountMenuOpen((open) => !open);
              }}
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
              aria-label={userLabel}
            >
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold"
                style={{
                  background: COLORS.box,
                  color: COLORS.accent,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                {userInitials}
              </span>
              {!accountMenuOpen && <RailTip>{userLabel}</RailTip>}
            </button>
          </div>
        </div>
      )}

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
    </aside>
  );
}

function AccountMenu({
  onOpenProfile,
  onLogout,
}: {
  onOpenProfile: () => void;
  onLogout: () => void;
}) {
  return (
    <div
      role="menu"
      aria-label="Меню аккаунта"
      className="rounded-2xl py-1.5 shadow-2xl overflow-hidden menu-pop"
      style={{
        background: COLORS.menu,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      <button
        type="button"
        role="menuitem"
        onClick={onOpenProfile}
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
        onClick={onLogout}
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
  );
}
