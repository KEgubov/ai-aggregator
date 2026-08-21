import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Brain, Gem, Link2, Rocket, Satellite, Sparkles, Zap, type LucideIcon } from 'lucide-react';
import ChatInput, { type ChatInputQuote, type ChatInputSendPayload } from './ChatInput';
import ChatThreading from './ChatThreading.jsx';
import ChatMembersAvatars from './ChatMembersAvatars';
import ChatInfoModal from './ChatInfoModal';
import SidebarToggle from './SidebarToggle';
import { createChatInvite } from '../api/chat';
import { fetchModels, isChatModel, resolveModelDisplayName, resolveTargetModels, type ApiModel } from '../api/models';
import { fetchMessages } from '../api/message';
import {
  clearChatStream,
  getChatStream,
  isChatStreaming,
  messagesWithStream,
  startChatGeneration,
  subscribeChatStream,
} from '../lib/chatStreamStore';
import {
  getLastServerMessageId,
  mapMessageFromApi,
  stripMentionTokens,
  type ApiMessage,
  type Message,
} from '../types/message';
import type { Chat } from '../types/chat';

const MODEL_ICONS: LucideIcon[] = [Sparkles, Zap, Gem, Brain, Rocket, Satellite];

const COLORS = {
  text: '#EDEDED',
  muted: '#949494',
  card: '#252525',
  accent: '#F5A623',
};

function mapApiModelToInput(model: ApiModel, index: number) {
  return {
    id: String(model.model_id),
    name: model.display_name,
    desc: model.description,
    count: 0,
    Icon: MODEL_ICONS[index % MODEL_ICONS.length],
  };
}

function mapMessagesWithDisplayNames(
  apiMessages: ApiMessage[],
  models: ApiModel[],
  currentUserId?: number | null,
): Message[] {
  return apiMessages.map((dto) => {
    const mapped = mapMessageFromApi(dto, currentUserId);
    if (mapped.type !== 'ai') return mapped;
    return {
      ...mapped,
      modelName: resolveModelDisplayName(models, mapped.modelName),
    };
  });
}

const INVITE_HINT_HOLD_MS = 1800;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface ChatViewProps {
  chat: Chat;
  currentUserId?: number | null;
  userInitials?: string;
  userLabel?: string;
  initialInviteHint?: string | null;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onChatRenamed?: (chat: Chat) => void;
}

export default function ChatView({
  chat,
  currentUserId = null,
  userInitials = 'Я',
  userLabel,
  initialInviteHint = null,
  sidebarOpen = false,
  onToggleSidebar,
  onChatRenamed,
}: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [apiModels, setApiModels] = useState<ApiModel[]>([]);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteHint, setInviteHint] = useState<string | null>(initialInviteHint);
  const [inviteHintLeaving, setInviteHintLeaving] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [quote, setQuote] = useState<ChatInputQuote | null>(null);

  const threadScrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const [composerPad, setComposerPad] = useState(96);
  const inviteHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openedWithHintRef = useRef(Boolean(initialInviteHint));
  const modelsLoadedRef = useRef(false);
  const messagesRef = useRef<Message[]>([]);
  const loadSeqRef = useRef(0);
  const chatIdRef = useRef(chat.chat_id);

  chatIdRef.current = chat.chat_id;
  messagesRef.current = messages;

  const subscribeStream = useCallback(
    (onStoreChange: () => void) => subscribeChatStream(chat.chat_id, onStoreChange),
    [chat.chat_id],
  );
  const stream = useSyncExternalStore(
    subscribeStream,
    () => getChatStream(chat.chat_id),
    () => null,
  );
  const displayMessages = useMemo(
    () => messagesWithStream(messages, stream),
    [messages, stream],
  );
  const isSending = stream?.status === 'running' || stream?.status === 'completed';

  useEffect(() => {
    setInfoOpen(false);
    setQuote(null);
  }, [chat.chat_id]);

  const inputModels = useMemo(
    () => apiModels.filter(isChatModel).map((model, index) => mapApiModelToInput(model, index)),
    [apiModels],
  );

  const loadModels = useCallback(async (): Promise<ApiModel[]> => {
    if (isLoadingModels) return apiModels;
    setIsLoadingModels(true);
    setModelsError(null);
    try {
      const models = await fetchModels();
      setApiModels(models);
      modelsLoadedRef.current = true;
      return models;
    } catch (err) {
      setModelsError(err instanceof Error ? err.message : 'Не удалось загрузить модели');
      return [];
    } finally {
      setIsLoadingModels(false);
    }
  }, [apiModels, isLoadingModels]);

  const handleMentionOpen = useCallback(() => {
    setModelsError(null);
    if (!modelsLoadedRef.current && !isLoadingModels) {
      void loadModels();
    }
  }, [isLoadingModels, loadModels]);

  useEffect(() => {
    const seq = ++loadSeqRef.current;
    setIsLoadingMessages(true);
    setMessagesError(null);

    void (async () => {
      try {
        const [apiMessages, models] = await Promise.all([
          fetchMessages(chat.chat_id),
          modelsLoadedRef.current && apiModels.length > 0
            ? Promise.resolve(apiModels)
            : fetchModels().then((list) => {
                setApiModels(list);
                modelsLoadedRef.current = true;
                return list;
              }).catch(() => apiModels),
        ]);
        if (seq !== loadSeqRef.current) return;
        setMessages(mapMessagesWithDisplayNames(apiMessages, models, currentUserId));
      } catch (err) {
        if (seq !== loadSeqRef.current) return;
        setMessagesError(err instanceof Error ? err.message : 'Не удалось загрузить сообщения');
      } finally {
        if (seq === loadSeqRef.current) {
          setIsLoadingMessages(false);
        }
      }
    })();
  }, [chat.chat_id, currentUserId]);

  useLayoutEffect(() => {
    const dock = composerRef.current;
    if (!dock) return;

    const update = () => {
      setComposerPad(Math.ceil(dock.getBoundingClientRect().height) + 12);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(dock);
    const pill = dock.querySelector('.cip-box') ?? dock.querySelector('.cip-root');
    if (pill) ro.observe(pill);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  useEffect(() => {
    const el = threadScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [displayMessages, composerPad]);

  useEffect(() => {
    if (initialInviteHint) {
      inviteHintTimerRef.current = setTimeout(() => {
        if (prefersReducedMotion()) {
          setInviteHint(null);
          setInviteHintLeaving(false);
        } else {
          setInviteHintLeaving(true);
        }
      }, INVITE_HINT_HOLD_MS);
    }
    return () => {
      if (inviteHintTimerRef.current) clearTimeout(inviteHintTimerRef.current);
    };
    // Подсказка с главной должна попасть в первый кадр (и в snapshot View Transition).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showInviteHint = useCallback((text: string) => {
    openedWithHintRef.current = false;
    setInviteHintLeaving(false);
    setInviteHint(text);
    if (inviteHintTimerRef.current) clearTimeout(inviteHintTimerRef.current);
    inviteHintTimerRef.current = setTimeout(() => {
      if (prefersReducedMotion()) {
        setInviteHint(null);
        setInviteHintLeaving(false);
        return;
      }
      setInviteHintLeaving(true);
    }, INVITE_HINT_HOLD_MS);
  }, []);

  const handleInvite = useCallback(async () => {
    if (inviteBusy) return;
    setInviteBusy(true);
    try {
      const token = await createChatInvite(chat.chat_id);
      const url = `${window.location.origin}/join/${token}`;
      await navigator.clipboard.writeText(url);
      showInviteHint('Ссылка скопирована');
    } catch (err) {
      showInviteHint(err instanceof Error ? err.message : 'Не удалось создать ссылку');
    } finally {
      setInviteBusy(false);
    }
  }, [chat.chat_id, inviteBusy, showInviteHint]);

  const reloadFromServer = useCallback(async () => {
    const chatId = chatIdRef.current;
    let models = apiModels;
    if (!modelsLoadedRef.current || models.length === 0) {
      try {
        models = await fetchModels();
        if (chatIdRef.current !== chatId) return;
        setApiModels(models);
        modelsLoadedRef.current = true;
      } catch {
        models = apiModels;
      }
    }
    const apiMessages = await fetchMessages(chatId);
    if (chatIdRef.current !== chatId) return;
    setMessages(mapMessagesWithDisplayNames(apiMessages, models, currentUserId));
  }, [apiModels, currentUserId]);

  const reloadRef = useRef(reloadFromServer);
  reloadRef.current = reloadFromServer;

  useEffect(() => {
    if (stream?.status === 'error' && stream.error) {
      setMessagesError(stream.error);
      void reloadRef.current();
      return;
    }
    if (stream?.status !== 'completed') return;

    let cancelled = false;
    void (async () => {
      try {
        await reloadRef.current();
      } finally {
        if (!cancelled && getChatStream(chat.chat_id)?.status === 'completed') {
          clearChatStream(chat.chat_id);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stream?.status, stream?.error, chat.chat_id]);

  const handleSend = useCallback(
    async (payload: ChatInputSendPayload): Promise<boolean> => {
      const chatId = chat.chat_id;
      if (isChatStreaming(chatId)) return false;

      const text = stripMentionTokens(
        payload.text,
        payload.modelTokens,
        payload.memberTokens,
      );
      if (!text) return false;

      const quotedId = Number(payload.contextAnchor);
      const parentId = Number.isInteger(quotedId) && quotedId > 0
        ? quotedId
        : getLastServerMessageId(messagesRef.current);
      setMessagesError(null);
      setModelsError(null);

      let currentModels = apiModels;
      if (payload.modelTokens.length > 0 && currentModels.length === 0) {
        currentModels = await loadModels();
      }

      const contextAnchor = payload.contextAnchor;
      const contextTextSnippet = payload.contextTextSnippet;

      if (payload.modelTokens.length === 0) {
        const started = startChatGeneration({
          chatId,
          content: text,
          parentId,
          contextAnchor,
          contextTextSnippet,
        });
        if (started) setQuote(null);
        return started;
      }

      const targets = resolveTargetModels(currentModels, payload.modelTokens);
      if (targets.length === 0) {
        setModelsError('Выбранная модель не найдена. Проверьте список моделей.');
        return false;
      }

      const model = targets[0];
      const started = startChatGeneration({
        chatId,
        content: text,
        parentId,
        modelId: model.model_id,
        modelName: model.display_name,
        contextAnchor,
        contextTextSnippet,
      });
      if (started) setQuote(null);
      return started;
    },
    [apiModels, chat.chat_id, loadModels],
  );

  return (
    <div className="h-full w-full bg-black text-white flex flex-col">
      <header
        className="chat-topbar shrink-0 px-3 sm:px-4 py-2"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))' }}
      >
        <div className="flex items-center gap-1 min-w-0">
          {onToggleSidebar && !sidebarOpen && (
            <div className="md:hidden">
              <SidebarToggle onClick={onToggleSidebar} />
            </div>
          )}
          <div className="flex items-center min-w-0 px-1.5 py-1">
            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              className="text-[15px] font-semibold tracking-tight truncate text-left rounded-md px-1 py-0.5 transition-colors max-w-[min(40vw,14rem)] sm:max-w-[18rem]"
              style={{ color: COLORS.text }}
              title={chat.name}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = COLORS.card;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {chat.name}
            </button>
          </div>
          <ChatMembersAvatars chatId={chat.chat_id} currentUsername={userLabel} />
          <div className="relative ml-auto shrink-0">
            <button
              type="button"
              onClick={() => void handleInvite()}
              disabled={inviteBusy}
              aria-label="Пригласить в чат"
              title="Пригласить в чат"
              className="p-2 rounded-lg transition-colors disabled:opacity-50"
              style={{ color: inviteHint === 'Ссылка скопирована' ? COLORS.accent : COLORS.muted }}
              onMouseEnter={(e) => {
                if (inviteBusy) return;
                e.currentTarget.style.color = COLORS.text;
                e.currentTarget.style.background = COLORS.card;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color =
                  inviteHint === 'Ссылка скопирована' ? COLORS.accent : COLORS.muted;
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <Link2 className="w-4 h-4" />
            </button>
            {inviteHint && (
              <span
                className={[
                  'invite-hint',
                  openedWithHintRef.current ? 'invite-hint-static' : '',
                  inviteHintLeaving ? 'is-leaving' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onAnimationEnd={(event) => {
                  if (event.animationName !== 'invite-hint-out') return;
                  setInviteHint(null);
                  setInviteHintLeaving(false);
                }}
                style={{
                  background: COLORS.card,
                  color: inviteHint === 'Ссылка скопирована' ? COLORS.accent : '#f87171',
                  border: '1px solid #424242',
                }}
              >
                {inviteHint}
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="chat-stage">
        <div
          ref={threadScrollRef}
          className="chat-scroll"
          style={{ paddingBottom: composerPad }}
        >
          <div className="chat-col chat-col-messages">
            {(messagesError || isLoadingMessages) && (
              <p className="text-center text-xs mb-3" style={{ color: messagesError ? '#f87171' : COLORS.muted }}>
                {messagesError ?? 'Загрузка сообщений…'}
              </p>
            )}
            <ChatThreading
              messages={displayMessages}
              userInitials={userInitials}
              onAskSelection={setQuote}
            />
          </div>
        </div>

        <div ref={composerRef} className="chat-dock">
          <div aria-hidden="true" className="chat-veil" />
          <div className="chat-col chat-col-dock">
            {(modelsError || isLoadingModels) && (
              <p
                className="thread-composer-status"
                style={{ color: modelsError ? '#f87171' : COLORS.muted }}
              >
                {modelsError ?? 'Загрузка моделей…'}
              </p>
            )}
            <ChatInput
              aiModels={inputModels}
              isSending={isSending}
              menuPlacement="up"
              quote={quote}
              onClearQuote={() => setQuote(null)}
              onMentionOpen={handleMentionOpen}
              onSend={handleSend}
              placeholder="Напишите сообщение или введите @ для выбора модели…"
            />
          </div>
        </div>
      </div>

      <ChatInfoModal
        open={infoOpen}
        chat={chat}
        currentUsername={userLabel}
        onClose={() => setInfoOpen(false)}
        onChatRenamed={onChatRenamed}
      />
    </div>
  );
}
