import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Brain, Gem, Link2, Rocket, Satellite, Sparkles, Zap, type LucideIcon } from 'lucide-react';
import ChatInput from './ChatInput';
import ChatThreading from './ChatThreading.jsx';
import ChatMembersAvatars from './ChatMembersAvatars';
import SidebarToggle from './SidebarToggle';
import { createChatInvite } from '../api/chat';
import { fetchModels, findModelByName, resolveModelDisplayName, type ApiModel } from '../api/models';
import { fetchMessages, sendChatMessage, streamMessage } from '../api/message';
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

function resolveTargetModels(apiModels: ApiModel[], modelTokens: string[]): ApiModel[] {
  if (modelTokens.length === 0) {
    return [];
  }
  return modelTokens
    .map((name) => findModelByName(apiModels, name))
    .filter((m): m is ApiModel => Boolean(m));
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

interface ChatViewProps {
  chat: Chat;
  currentUserId?: number | null;
  userInitials?: string;
  userLabel?: string;
  onToggleSidebar?: () => void;
}

export default function ChatView({
  chat,
  currentUserId = null,
  userInitials = 'Я',
  userLabel,
  onToggleSidebar,
}: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [apiModels, setApiModels] = useState<ApiModel[]>([]);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteHint, setInviteHint] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inviteHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const modelsLoadedRef = useRef(false);
  const messagesRef = useRef<Message[]>([]);
  const sendingRef = useRef(false);
  const loadSeqRef = useRef(0);
  const streamSeqRef = useRef(0);

  messagesRef.current = messages;

  const inputModels = useMemo(
    () => apiModels.map((model, index) => mapApiModelToInput(model, index)),
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
    setInviteHint(null);

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
        if (seq !== loadSeqRef.current || sendingRef.current) return;
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (inviteHintTimerRef.current) clearTimeout(inviteHintTimerRef.current);
    };
  }, []);

  const showInviteHint = useCallback((text: string) => {
    setInviteHint(text);
    if (inviteHintTimerRef.current) clearTimeout(inviteHintTimerRef.current);
    inviteHintTimerRef.current = setTimeout(() => setInviteHint(null), 2200);
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
    let models = apiModels;
    if (!modelsLoadedRef.current || models.length === 0) {
      try {
        models = await fetchModels();
        setApiModels(models);
        modelsLoadedRef.current = true;
      } catch {
        models = apiModels;
      }
    }
    const apiMessages = await fetchMessages(chat.chat_id);
    setMessages(mapMessagesWithDisplayNames(apiMessages, models, currentUserId));
  }, [apiModels, chat.chat_id, currentUserId]);

  const handleSend = useCallback(
    async (payload: { text: string; modelTokens: string[]; memberTokens: string[] }) => {
      if (sendingRef.current) return;

      const text = stripMentionTokens(
        payload.text,
        payload.modelTokens,
        payload.memberTokens,
      );
      if (!text) return;

      const parentId = getLastServerMessageId(messagesRef.current);
      const streamSeq = ++streamSeqRef.current;

      sendingRef.current = true;
      setMessagesError(null);
      setModelsError(null);

      try {
        let currentModels = apiModels;
        if (currentModels.length === 0) {
          currentModels = await loadModels();
        }

        if (payload.modelTokens.length === 0) {
          await sendChatMessage({ chatId: chat.chat_id, content: text, parentId });
          if (streamSeq !== streamSeqRef.current) return;
          await reloadFromServer();
          return;
        }

        const targets = resolveTargetModels(currentModels, payload.modelTokens);
        if (targets.length === 0) {
          setModelsError('Выбранная модель не найдена. Проверьте список моделей.');
          return;
        }

        // Одна модель за запрос: иначе /message/send заново сохраняет user на каждый стрим.
        const model = targets[0];
        const userId = `local-user-${streamSeq}`;
        const assistantId = `local-ai-${streamSeq}`;

        setMessages((prev) => [
          ...prev,
          { id: userId, type: 'user', text, isMe: true },
          {
            id: assistantId,
            type: 'ai',
            text: '',
            modelName: model.display_name,
            isStreaming: true,
          },
        ]);

        let assistantText = '';
        let acceptChunks = true;

        try {
          await streamMessage(
            {
              chatId: chat.chat_id,
              modelId: model.model_id,
              content: text,
              parentId,
            },
            (chunk) => {
              if (!acceptChunks || streamSeq !== streamSeqRef.current) return;
              assistantText += chunk;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, text: assistantText, isStreaming: true }
                    : m,
                ),
              );
            },
          );
        } catch (err) {
          acceptChunks = false;
          const errorText = err instanceof Error ? err.message : 'Ошибка генерации';
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    text: `⚠ ${errorText}`,
                    isStreaming: false,
                  }
                : m,
            ),
          );
          setMessagesError(errorText);
          return;
        }

        acceptChunks = false;
        if (streamSeq !== streamSeqRef.current) return;

        // Полностью заменить локальные temp-сообщения серверным снимком — без concat.
        await reloadFromServer();
      } catch (err) {
        setMessagesError(err instanceof Error ? err.message : 'Не удалось отправить сообщение');
      } finally {
        if (streamSeq === streamSeqRef.current) {
          sendingRef.current = false;
        }
      }
    },
    [apiModels, chat.chat_id, loadModels, reloadFromServer],
  );

  return (
    <div className="h-full w-full bg-black text-white flex flex-col">
      <header
        className="shrink-0 px-3 sm:px-4 py-2"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))' }}
      >
        <div className="flex items-center gap-1 min-w-0">
          {onToggleSidebar && <SidebarToggle onClick={onToggleSidebar} />}
          <div className="flex items-center min-w-0 px-1.5 py-1">
            <span className="text-[15px] font-semibold tracking-tight truncate" style={{ color: COLORS.text }}>
              AI Aggregator
            </span>
          </div>
          <ChatMembersAvatars chatId={chat.chat_id} ownerUsername={userLabel} />
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
                className="absolute right-0 top-[calc(100%+6px)] z-50 whitespace-nowrap rounded-md px-2 py-1 text-[11px] shadow-lg"
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

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {(messagesError || isLoadingMessages) && (
          <p className="text-center text-xs mb-3" style={{ color: messagesError ? '#f87171' : COLORS.muted }}>
            {messagesError ?? 'Загрузка сообщений…'}
          </p>
        )}
        <ChatThreading messages={messages} userInitials={userInitials} />
        <div ref={bottomRef} aria-hidden="true" className="h-px" />
      </div>

      <div
        className="shrink-0 px-4 sm:px-6 pt-2"
        style={{ paddingBottom: 'max(1.5rem, calc(env(safe-area-inset-bottom, 0px) + 1rem))' }}
      >
        {(modelsError || isLoadingModels) && (
          <p className="text-center text-xs mb-3" style={{ color: modelsError ? '#f87171' : COLORS.muted }}>
            {modelsError ?? 'Загрузка моделей…'}
          </p>
        )}
        <ChatInput
          aiModels={inputModels}
          onMentionOpen={handleMentionOpen}
          onSend={handleSend}
          placeholder="Напишите сообщение или введите @ для выбора модели…"
        />
      </div>
    </div>
  );
}
