import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Brain, Gem, Rocket, Satellite, Sparkles, Zap, type LucideIcon } from 'lucide-react';
import ChatInput from './ChatInput';
import ChatThreading from './ChatThreading.jsx';
import { fetchModels, findModelByName, type ApiModel } from '../api/models';
import { fetchMessages, sendChatMessage, streamMessage } from '../api/message';
import { createId, mapMessageFromApi, stripMentionTokens, type Message } from '../types/message';
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
  onBack: () => void;
}

export default function ChatView({ chat, onBack }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [apiModels, setApiModels] = useState<ApiModel[]>([]);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const modelsLoadedRef = useRef(false);

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
    let cancelled = false;

    async function loadMessages() {
      setIsLoadingMessages(true);
      setMessagesError(null);
      try {
        const apiMessages = await fetchMessages(chat.chat_id);
        if (!cancelled) {
          setMessages(apiMessages.map(mapMessageFromApi));
        }
      } catch (err) {
        if (!cancelled) {
          setMessagesError(err instanceof Error ? err.message : 'Не удалось загрузить сообщения');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMessages(false);
        }
      }
    }

    void loadMessages();
    return () => {
      cancelled = true;
    };
  }, [chat.chat_id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const updateAssistantMessage = useCallback((id: string, patch: Partial<Message>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const runGeneration = useCallback(
    async (model: ApiModel, prompt: string, assistantId: string): Promise<Message> => {
      let assistantText = '';
      try {
        await streamMessage(
          {
            chatId: chat.chat_id,
            modelId: model.model_id,
            content: prompt,
          },
          (chunk) => {
            assistantText += chunk;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, text: assistantText, isStreaming: true } : m,
              ),
            );
          },
        );

        return {
          id: assistantId,
          type: 'ai',
          text: assistantText,
          modelName: model.display_name,
          isStreaming: false,
        };
      } catch (err) {
        const errorText = err instanceof Error ? err.message : 'Ошибка генерации';
        const errorMessage: Message = {
          id: assistantId,
          type: 'ai',
          text: `⚠ ${errorText}`,
          modelName: model.display_name,
          isStreaming: false,
        };
        updateAssistantMessage(assistantId, errorMessage);
        return errorMessage;
      }
    },
    [chat.chat_id, updateAssistantMessage],
  );

  const handleSend = useCallback(
    async (payload: { text: string; modelTokens: string[]; memberTokens: string[] }) => {
      const text = stripMentionTokens(
        payload.text,
        payload.modelTokens,
        payload.memberTokens,
      );
      if (!text) return;

      let currentModels = apiModels;
      if (currentModels.length === 0) {
        currentModels = await loadModels();
      }

      if (payload.modelTokens.length === 0) {
        setModelsError(null);
        try {
          await sendChatMessage({ chatId: chat.chat_id, content: text });
          const apiMessages = await fetchMessages(chat.chat_id);
          setMessages(apiMessages.map(mapMessageFromApi));
        } catch (err) {
          setMessagesError(err instanceof Error ? err.message : 'Не удалось отправить сообщение');
        }
        return;
      }

      const targets = resolveTargetModels(currentModels, payload.modelTokens);
      if (targets.length === 0) {
        setModelsError('Выбранная модель не найдена. Проверьте список моделей.');
        return;
      }

      setModelsError(null);

      const assistantMessages: Message[] = [];

      for (const model of targets) {
        const assistantId = createId();
        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            type: 'ai',
            text: '',
            modelName: model.display_name,
            isStreaming: true,
          },
        ]);
        assistantMessages.push(await runGeneration(model, text, assistantId));
      }

      try {
        const apiMessages = await fetchMessages(chat.chat_id);
        setMessages([...apiMessages.map(mapMessageFromApi), ...assistantMessages]);
      } catch (err) {
        setMessagesError(err instanceof Error ? err.message : 'Не удалось обновить сообщения');
      }
    },
    [apiModels, chat.chat_id, loadModels, runGeneration],
  );

  return (
    <div className="w-full min-h-screen bg-black text-white flex flex-col">
      <header
        className="shrink-0 px-6 py-4 flex items-center gap-4"
        style={{ borderBottom: `1px solid ${COLORS.border}` }}
      >
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
          style={{ color: COLORS.muted, border: `1px solid ${COLORS.border}` }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = COLORS.text;
            e.currentTarget.style.borderColor = '#F5A623';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = COLORS.muted;
            e.currentTarget.style.borderColor = COLORS.border;
          }}
          aria-label="К списку чатов"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
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
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {(messagesError || isLoadingMessages) && (
          <p className="text-center text-xs mb-3" style={{ color: messagesError ? '#f87171' : COLORS.muted }}>
            {messagesError ?? 'Загрузка сообщений…'}
          </p>
        )}
        <ChatThreading messages={messages} />
        <div ref={bottomRef} aria-hidden="true" className="h-px" />
      </div>

      <div className="shrink-0 px-6 pb-8 pt-2">
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
