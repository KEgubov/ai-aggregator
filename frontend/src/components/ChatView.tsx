import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Brain, Gem, Rocket, Satellite, Sparkles, Zap, type LucideIcon } from 'lucide-react';
import ChatInput from './ChatInput';
import ChatThreading from './ChatThreading.jsx';
import SidebarToggle from './SidebarToggle';
import { fetchModels, findModelByName, type ApiModel } from '../api/models';
import { fetchMessages, sendChatMessage, streamMessage } from '../api/message';
import {
  getLastServerMessageId,
  mapMessageFromApi,
  stripMentionTokens,
  type Message,
} from '../types/message';
import type { Chat } from '../types/chat';

const MODEL_ICONS: LucideIcon[] = [Sparkles, Zap, Gem, Brain, Rocket, Satellite];

const COLORS = {
  border: '#424242',
  text: '#EDEDED',
  muted: '#949494',
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

interface ChatViewProps {
  chat: Chat;
  userInitials?: string;
  onToggleSidebar?: () => void;
}

export default function ChatView({
  chat,
  userInitials = 'Я',
  onToggleSidebar,
}: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [apiModels, setApiModels] = useState<ApiModel[]>([]);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
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

    void (async () => {
      try {
        const apiMessages = await fetchMessages(chat.chat_id);
        if (seq !== loadSeqRef.current || sendingRef.current) return;
        setMessages(apiMessages.map(mapMessageFromApi));
      } catch (err) {
        if (seq !== loadSeqRef.current) return;
        setMessagesError(err instanceof Error ? err.message : 'Не удалось загрузить сообщения');
      } finally {
        if (seq === loadSeqRef.current) {
          setIsLoadingMessages(false);
        }
      }
    })();
  }, [chat.chat_id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const reloadFromServer = useCallback(async () => {
    const apiMessages = await fetchMessages(chat.chat_id);
    setMessages(apiMessages.map(mapMessageFromApi));
  }, [chat.chat_id]);

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
        className="shrink-0 px-4 sm:px-6 py-4"
        style={{
          borderBottom: `1px solid ${COLORS.border}`,
          paddingTop: 'max(1rem, env(safe-area-inset-top, 0px))',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {onToggleSidebar && <SidebarToggle onClick={onToggleSidebar} />}
          <div className="min-w-0">
            <h1 className="text-base font-semibold truncate" style={{ color: COLORS.text }}>
              {chat.name}
            </h1>
            {chat.description && (
              <p className="text-xs truncate mt-0.5" style={{ color: COLORS.muted }}>
                {chat.description}
              </p>
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
