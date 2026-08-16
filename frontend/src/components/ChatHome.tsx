import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Brain,
  Code2,
  Gem,
  GitCompareArrows,
  Loader2,
  MessageSquare,
  MessagesSquare,
  Rocket,
  Satellite,
  Sparkles,
  UserPlus,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import ChatInput, { type ChatInputDraft, type ChatInputSendPayload, type InputAiModel } from './ChatInput';
import SidebarToggle from './SidebarToggle';
import { createChat, createChatInvite } from '../api/chat';
import { ApiError } from '../api/client';
import {
  fetchLinkedModels,
  fetchModels,
  isChatModel,
  resolveModelDisplayName,
  resolveTargetModels,
  type ApiModel,
} from '../api/models';
import { startChatGeneration } from '../lib/chatStreamStore';
import type { Chat } from '../types/chat';
import { formatMessageDate, stripMentionTokens } from '../types/message';
import { isViewTransitioning } from '../utils/viewTransition';

const COLORS = {
  text: '#EDEDED',
  muted: '#949494',
  error: '#f87171',
};

const MODEL_ICONS: LucideIcon[] = [Sparkles, Zap, Gem, Brain, Rocket, Satellite];
const GENERIC_USER_LABELS = new Set(['', 'пользователь', 'я']);
const RECENT_LIMIT = 6;
const FEATURED_LIMIT = 6;
const FEATURED_ORDER = [
  'compound mini',
  'compound',
  'llama 4',
  'llama 3.3',
  'llama 3.1',
  'gpt oss 120',
  'gpt oss 20',
];

function mapApiModelToInput(model: ApiModel, index: number): InputAiModel {
  return {
    id: String(model.model_id),
    name: model.display_name,
    desc: model.description,
    count: 0,
    Icon: MODEL_ICONS[index % MODEL_ICONS.length],
  };
}

function pickFeaturedModels(models: InputAiModel[], limit: number): InputAiModel[] {
  const remaining = [...models];
  const picked: InputAiModel[] = [];
  for (const hint of FEATURED_ORDER) {
    const idx = remaining.findIndex((model) => model.name.toLowerCase().includes(hint));
    if (idx < 0) continue;
    picked.push(remaining.splice(idx, 1)[0]);
    if (picked.length >= limit) return picked;
  }
  return [...picked, ...remaining].slice(0, limit);
}

function greetingName(label?: string): string | null {
  const name = label?.trim() ?? '';
  if (GENERIC_USER_LABELS.has(name.toLowerCase())) return null;
  return name;
}

export type ChatCreatedOptions = {
  inviteHint?: string;
};

interface ChatHomeProps {
  userLabel?: string;
  chats?: Chat[];
  isLoadingChats?: boolean;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onSelectChat?: (chat: Chat) => void;
  onChatCreated: (chat: Chat, options?: ChatCreatedOptions) => void;
}

export default function ChatHome({
  userLabel,
  chats = [],
  isLoadingChats = false,
  sidebarOpen = false,
  onToggleSidebar,
  onSelectChat,
  onChatCreated,
}: ChatHomeProps) {
  const [apiModels, setApiModels] = useState<ApiModel[]>([]);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [draft, setDraft] = useState<ChatInputDraft | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [linkedByChatId, setLinkedByChatId] = useState<Record<number, string[]>>({});
  const sendingLockRef = useRef(false);
  const [hubEnter] = useState(() => !isViewTransitioning());

  const name = greetingName(userLabel);
  const isFresh = !isLoadingChats && chats.length === 0;
  const busy = isSending || isInviting;

  const inputModels = useMemo(
    () => apiModels.filter(isChatModel).map((model, index) => mapApiModelToInput(model, index)),
    [apiModels],
  );
  const featuredModels = useMemo(
    () => pickFeaturedModels(inputModels, FEATURED_LIMIT),
    [inputModels],
  );
  const hasMoreModels = inputModels.length > featuredModels.length;

  const recentChats = useMemo(() => {
    return [...chats]
      .sort((a, b) => {
        const aTime = new Date(a.updated_at || a.created_at).getTime();
        const bTime = new Date(b.updated_at || b.created_at).getTime();
        return bTime - aTime;
      })
      .slice(0, RECENT_LIMIT);
  }, [chats]);

  const recentChatIdsKey = useMemo(
    () => recentChats.map((chat) => chat.chat_id).join(','),
    [recentChats],
  );

  useEffect(() => {
    if (!recentChatIdsKey) {
      setLinkedByChatId({});
      return;
    }
    const ids = recentChatIdsKey.split(',').map(Number);
    let cancelled = false;
    void Promise.all(
      ids.map(async (chatId) => {
        try {
          return [chatId, await fetchLinkedModels(chatId)] as const;
        } catch {
          return [chatId, null] as const;
        }
      }),
    ).then((entries) => {
      if (cancelled) return;
      const next: Record<number, string[]> = {};
      for (const [chatId, names] of entries) {
        if (names) next[chatId] = names;
      }
      setLinkedByChatId(next);
    });
    return () => {
      cancelled = true;
    };
  }, [recentChatIdsKey]);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingModels(true);
    setModelsError(null);
    void fetchModels()
      .then((models) => {
        if (!cancelled) setApiModels(models);
      })
      .catch((err) => {
        if (!cancelled) {
          setModelsError(err instanceof Error ? err.message : 'Не удалось загрузить модели');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingModels(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const applyDraft = useCallback((next: Omit<ChatInputDraft, 'key'>) => {
    setDraft({ ...next, key: Date.now() });
  }, []);

  const handleMentionOpen = useCallback(() => {
    setModelsError(null);
  }, []);

  const handleSend = useCallback(
    async (payload: ChatInputSendPayload): Promise<boolean> => {
      if (sendingLockRef.current || isInviting) return false;

      const text = stripMentionTokens(payload.text, payload.modelTokens, payload.memberTokens);
      if (!text) return false;

      sendingLockRef.current = true;
      setIsSending(true);
      setSendError(null);

      try {
        let modelId: number | undefined;
        let modelName: string | undefined;

        if (payload.modelTokens.length > 0) {
          let catalog = apiModels;
          if (catalog.length === 0) {
            catalog = await fetchModels();
            setApiModels(catalog);
          }
          const target = resolveTargetModels(catalog, payload.modelTokens)[0];
          if (!target) {
            setSendError('Выбранная модель не найдена. Проверьте список моделей.');
            return false;
          }
          modelId = target.model_id;
          modelName = target.display_name;
        }

        const chat = await createChat();
        startChatGeneration({
          chatId: chat.chat_id,
          content: text,
          modelId,
          modelName,
        });
        onChatCreated(chat);
        return true;
      } catch (err) {
        setSendError(
          err instanceof ApiError || err instanceof Error ? err.message : 'Не удалось создать чат',
        );
        return false;
      } finally {
        sendingLockRef.current = false;
        setIsSending(false);
      }
    },
    [apiModels, isInviting, onChatCreated],
  );

  const handleInviteToChat = useCallback(async () => {
    if (sendingLockRef.current || isInviting) return;
    sendingLockRef.current = true;
    setIsInviting(true);
    setSendError(null);

    try {
      const chat = await createChat();
      try {
        const token = await createChatInvite(chat.chat_id);
        await navigator.clipboard.writeText(`${window.location.origin}/join/${token}`);
        onChatCreated(chat, { inviteHint: 'Ссылка скопирована' });
      } catch (err) {
        onChatCreated(chat, {
          inviteHint: err instanceof Error ? err.message : 'Не удалось создать ссылку',
        });
      }
    } catch (err) {
      setSendError(
        err instanceof ApiError || err instanceof Error ? err.message : 'Не удалось создать чат',
      );
    } finally {
      sendingLockRef.current = false;
      setIsInviting(false);
    }
  }, [isInviting, onChatCreated]);

  const firstModel = featuredModels[0] ?? inputModels[0];

  return (
    <div className="home-hub">
      <div className="home-hub-glow" aria-hidden="true" />
      {onToggleSidebar && !sidebarOpen && (
        <header
          className="shrink-0 px-4 sm:px-6 py-3 relative z-10 md:hidden"
          style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}
        >
          <SidebarToggle onClick={onToggleSidebar} />
        </header>
      )}

      <div className="home-hub-scroll">
        <div className={['home-hub-inner', isFresh ? 'is-fresh' : '', hubEnter ? 'home-hub-enter' : ''].filter(Boolean).join(' ')}>
          <div className="home-hub-hero">
            <h1 className="text-[1.65rem] sm:text-[1.85rem] font-semibold tracking-tight text-center" style={{ color: COLORS.text }}>
              {name ? `Привет, ${name}` : 'Привет'}
            </h1>
            <p className="text-sm mt-2 text-center" style={{ color: COLORS.muted }}>
              Один чат — несколько моделей
            </p>
            {isFresh && (
              <ol className="home-hub-steps" aria-label="Как начать">
                <li>Напишите вопрос</li>
                <li>
                  <span className="home-hub-kbd">@</span> выберите модель
                </li>
                <li>Позовите человека ссылкой</li>
              </ol>
            )}
          </div>

          <div className="home-hub-composer">
            {sendError && (
              <p className="text-center text-xs mb-3" style={{ color: COLORS.error }}>
                {sendError}
              </p>
            )}
            {modelsError && !sendError && (
              <p className="text-center text-xs mb-3" style={{ color: COLORS.error }}>
                {modelsError}
              </p>
            )}
            <ChatInput
              aiModels={inputModels}
              isSending={busy}
              autoFocus
              draft={draft}
              menuPlacement="down"
              onMentionOpen={handleMentionOpen}
              onMenuOpenChange={setPickerOpen}
              onSend={handleSend}
              placeholder="Напишите сообщение или введите @ для выбора модели…"
            />
          </div>

          <div className={['home-hub-rest', pickerOpen ? 'is-picker-open' : ''].filter(Boolean).join(' ')}>
            <div className="home-hub-chips">
              <button
                type="button"
                className="home-chip"
                disabled={busy || !firstModel}
                onClick={() => applyDraft({ modelId: firstModel?.id })}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Спросить модель
              </button>
              <button
                type="button"
                className="home-chip"
                disabled={busy}
                onClick={() =>
                  applyDraft({
                    text: 'Найди проблемы и предложи правки: ',
                    modelId: firstModel?.id,
                  })
                }
              >
                <Code2 className="w-3.5 h-3.5" />
                Разобрать код
              </button>
              <button
                type="button"
                className="home-chip"
                disabled={busy}
                onClick={() =>
                  applyDraft({
                    text: 'Дай два разных подхода и скажи, какой лучше: ',
                    modelId: firstModel?.id,
                  })
                }
              >
                <GitCompareArrows className="w-3.5 h-3.5" />
                Сравнить подходы
              </button>
              <button
                type="button"
                className="home-chip"
                disabled={busy}
                onClick={() => void handleInviteToChat()}
              >
                {isInviting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                Пригласить в чат
              </button>
            </div>

          {!isFresh && (
            <section className="home-hub-section" aria-label="Недавние чаты">
              <div className="home-hub-section-head">
                <h2>Продолжить</h2>
                {chats.length > RECENT_LIMIT && (
                  <span>ещё {chats.length - RECENT_LIMIT} в меню</span>
                )}
              </div>
              <div className="home-hub-grid">
                {recentChats.map((chat) => {
                  const rawNames = Object.prototype.hasOwnProperty.call(linkedByChatId, chat.chat_id)
                    ? linkedByChatId[chat.chat_id]
                    : (chat.ai_models ?? []);
                  const modelNames = rawNames
                    .map((name) => resolveModelDisplayName(apiModels, name) ?? name)
                    .filter(Boolean)
                    .slice(0, 3);
                  return (
                  <button
                    key={chat.chat_id}
                    type="button"
                    className="home-card"
                    onClick={() => onSelectChat?.(chat)}
                  >
                    <span className="home-card-icon">
                      <MessagesSquare className="w-4 h-4" />
                    </span>
                    <span className="home-card-body">
                      <span className="home-card-title">{chat.name}</span>
                      <span className="home-card-meta">
                        {formatMessageDate(chat.updated_at || chat.created_at)}
                      </span>
                      {modelNames.length > 0 && (
                        <span className="home-card-pills">
                          {modelNames.map((model) => (
                            <span key={model} className="home-pill">
                              {model}
                            </span>
                          ))}
                        </span>
                      )}
                    </span>
                  </button>
                  );
                })}
              </div>
            </section>
          )}

          {(isLoadingModels || featuredModels.length > 0) && (
            <section className="home-hub-section home-hub-models" aria-label="Модели">
              <div className="home-hub-section-head">
                <h2>Модели</h2>
                {hasMoreModels && (
                  <button
                    type="button"
                    className="home-hub-section-action"
                    disabled={busy}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => applyDraft({ openPicker: true })}
                  >
                    Все модели
                  </button>
                )}
              </div>
              {isLoadingModels && featuredModels.length === 0 ? (
                <p className="text-xs" style={{ color: COLORS.muted }}>
                  Загрузка…
                </p>
              ) : (
                <div className="home-hub-grid">
                  {featuredModels.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      className="home-card home-card-model"
                      disabled={busy}
                      onClick={() => applyDraft({ modelId: model.id })}
                    >
                      <span className="home-card-icon home-card-icon-accent">
                        <model.Icon className="w-4 h-4" />
                      </span>
                      <span className="home-card-body">
                        <span className="home-card-title">{model.name}</span>
                        {model.desc && <span className="home-card-desc">{model.desc}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
