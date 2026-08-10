import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { Check, Loader2, Pencil, X } from 'lucide-react';
import { fetchChatMembers, renameChat } from '../api/chat';
import { ApiError } from '../api/client';
import { useModalPresence } from '../hooks/useModalPresence';
import { initialsFromName } from '../types/user';
import type { Chat, ChatMember } from '../types/chat';

const COLORS = {
  box: '#2D2D2D',
  border: '#424242',
  card: '#252525',
  nested: '#1f1f1f',
  accent: '#F5A623',
  text: '#EDEDED',
  muted: '#949494',
  error: '#f87171',
  modal: '#212121',
  ownerBadge: '#7c5cff',
};

const NAME_MAX = 255;

interface ChatInfoModalProps {
  open: boolean;
  chat: Chat;
  currentUsername?: string;
  onClose: () => void;
  onChatRenamed?: (chat: Chat) => void;
}

export default function ChatInfoModal({
  open,
  chat,
  currentUsername,
  onClose,
  onChatRenamed,
}: ChatInfoModalProps) {
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(chat.name);
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSavingName, setIsSavingName] = useState(false);

  const { mounted, entered } = useModalPresence(open);

  const isOwner = members.some(
    (m) =>
      m.is_owner &&
      currentUsername &&
      m.username.trim().toLowerCase() === currentUsername.trim().toLowerCase(),
  );

  const loadMembers = useCallback(async () => {
    setIsLoadingMembers(true);
    setMembersError(null);
    try {
      const data = await fetchChatMembers(chat.chat_id);
      setMembers(data);
    } catch (err) {
      if (err instanceof ApiError) {
        setMembersError(err.message);
      } else {
        setMembersError(err instanceof Error ? err.message : 'Не удалось загрузить участников');
      }
      setMembers([]);
    } finally {
      setIsLoadingMembers(false);
    }
  }, [chat.chat_id]);

  useEffect(() => {
    if (!open) return;
    setIsEditingName(false);
    setNameDraft(chat.name);
    setNameError(null);
    void loadMembers();
  }, [open, chat.chat_id, chat.name, loadMembers]);

  useEffect(() => {
    if (!mounted) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isSavingName) onClose();
    }

    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [mounted, isSavingName, onClose]);

  function startEditingName() {
    if (!isOwner || isSavingName) return;
    setNameError(null);
    setNameDraft(chat.name);
    setIsEditingName(true);
  }

  function cancelEditingName() {
    setIsEditingName(false);
    setNameDraft(chat.name);
    setNameError(null);
  }

  async function handleSaveName(event: FormEvent) {
    event.preventDefault();
    if (!isOwner || isSavingName) return;

    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setNameError('Введите название');
      return;
    }
    if (trimmed === chat.name) {
      setIsEditingName(false);
      setNameError(null);
      return;
    }

    setIsSavingName(true);
    setNameError(null);
    try {
      const updated = await renameChat(chat.chat_id, trimmed);
      onChatRenamed?.(updated);
      setIsEditingName(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setNameError(err.message);
      } else {
        setNameError(err instanceof Error ? err.message : 'Не удалось переименовать');
      }
    } finally {
      setIsSavingName(false);
    }
  }

  if (!mounted) return null;

  const sortedMembers = [...members].sort((a, b) => Number(b.is_owner) - Number(a.is_owner));
  const membersCount = members.length;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="presentation"
    >
      <div
        className={`absolute inset-0 modal-backdrop${entered ? ' modal-backdrop-open' : ''}`}
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(1px)',
          WebkitBackdropFilter: 'blur(1px)',
        }}
        onClick={() => {
          if (!isSavingName) onClose();
        }}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Информация о чате"
        className={`relative w-full max-w-[380px] max-h-[min(90dvh,640px)] rounded-3xl overflow-hidden flex flex-col shadow-2xl modal-panel${entered ? ' modal-panel-open' : ''}`}
        style={{
          background: COLORS.modal,
          border: `1px solid ${COLORS.border}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 flex justify-end px-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="p-2 rounded-xl transition-colors"
            style={{ color: COLORS.muted }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = COLORS.text;
              e.currentTarget.style.background = COLORS.card;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = COLORS.muted;
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-5">
          <div className="flex flex-col items-center text-center px-2 pb-5">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-semibold mb-4"
              style={{
                background: COLORS.box,
                color: COLORS.accent,
                border: `1px solid ${COLORS.border}`,
              }}
            >
              {initialsFromName(chat.name)}
            </div>

            {isEditingName ? (
              <form onSubmit={(e) => void handleSaveName(e)} className="w-full max-w-xs space-y-3">
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  maxLength={NAME_MAX}
                  autoFocus
                  disabled={isSavingName}
                  className="w-full rounded-xl px-3 py-2 text-center text-lg font-semibold outline-none"
                  style={{
                    background: COLORS.nested,
                    color: COLORS.text,
                    border: `1px solid ${COLORS.border}`,
                  }}
                  aria-label="Название чата"
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
              <div className="flex items-center justify-center gap-2 max-w-full">
                <h3
                  className="text-xl font-semibold truncate"
                  style={{ color: COLORS.text }}
                  title={chat.name}
                >
                  {chat.name}
                </h3>
                {isOwner && (
                  <button
                    type="button"
                    onClick={startEditingName}
                    className="shrink-0 p-1.5 rounded-lg transition-colors"
                    style={{ color: COLORS.muted }}
                    aria-label="Изменить название"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = COLORS.accent;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = COLORS.muted;
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {nameError && (
              <p className="text-sm mt-2" style={{ color: COLORS.error }}>
                {nameError}
              </p>
            )}

            {chat.description?.trim() && !isEditingName && (
              <p className="text-sm mt-2" style={{ color: COLORS.muted }}>
                {chat.description}
              </p>
            )}

            <p className="text-sm mt-1.5" style={{ color: COLORS.muted }}>
              {isLoadingMembers
                ? 'Загрузка…'
                : `${membersCount} ${membersLabel(membersCount)}`}
            </p>
          </div>

          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: COLORS.box, border: `1px solid ${COLORS.border}` }}
          >
            <div
              className="px-3.5 py-2.5 text-[11px] font-medium uppercase tracking-wide"
              style={{ color: COLORS.muted }}
            >
              Участники
            </div>

            {isLoadingMembers ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: COLORS.muted }} />
              </div>
            ) : membersError ? (
              <div className="px-3.5 py-5 text-center space-y-3">
                <p className="text-sm" style={{ color: COLORS.error }}>
                  {membersError}
                </p>
                <button
                  type="button"
                  onClick={() => void loadMembers()}
                  className="rounded-xl px-4 py-2 text-sm font-medium"
                  style={{ background: COLORS.accent, color: '#1a1a1a' }}
                >
                  Повторить
                </button>
              </div>
            ) : sortedMembers.length === 0 ? (
              <p className="px-3.5 py-5 text-sm text-center" style={{ color: COLORS.muted }}>
                Нет участников
              </p>
            ) : (
              <ul>
                {sortedMembers.map((member) => (
                  <li
                    key={member.username}
                    className="flex items-center gap-3 px-3.5 py-2.5"
                    style={{ borderTop: `1px solid ${COLORS.border}` }}
                  >
                    <span
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                      style={{
                        background: COLORS.nested,
                        color: COLORS.accent,
                        border: `1px solid ${COLORS.border}`,
                      }}
                    >
                      {initialsFromName(member.username)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium truncate" style={{ color: COLORS.text }}>
                          {member.username}
                        </span>
                        {member.is_owner && (
                          <span
                            className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-md"
                            style={{
                              background: 'rgba(124, 92, 255, 0.18)',
                              color: COLORS.ownerBadge,
                            }}
                          >
                            владелец
                          </span>
                        )}
                      </span>
                      <span className="block text-[11px] mt-0.5 truncate" style={{ color: COLORS.muted }}>
                        {member.about_me?.trim() || 'Нет описания'}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function membersLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'участник';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'участника';
  return 'участников';
}
