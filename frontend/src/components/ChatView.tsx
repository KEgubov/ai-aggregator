import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Brain, Gem, Rocket, Satellite, Sparkles, Zap, type LucideIcon } from 'lucide-react';
import ChatInput from './ChatInput';
import ChatThreading from './ChatThreading.jsx';
import { fetchModels, findModelByName, type ApiModel } from '../api/models';
import { streamMessage } from '../api/message';
import { createId, stripMentionTokens, type Message } from '../types/message';
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
  if (modelTokens.length > 0) {
    return modelTokens
      .map((name) => findModelByName(apiModels, name))
      .filter((m): m is ApiModel => Boolean(m));
  }
  return apiModels.length > 0 ? [apiModels[0]] : [];
}

interface ChatViewProps {
  chat: Chat;
  onBack: () => void;
}

export default function ChatView({ chat, onBack }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [apiModels, setApiModels] = useState<ApiModel[]>([]);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

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
    if (!modelsLoadedRef.current && !isLoadingModels) {
      void loadModels();
    }
  }, [isLoadingModels, loadModels]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const updateAssistantMessage = useCallback((id: string, patch: Partial<Message>) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const runGeneration = useCallback(
    async (model: ApiModel, prompt: string, assistantId: string) => {
      try {
        await streamMessage(chat.chat_id, model.model_id, prompt, (chunk) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, text: m.text + chunk, isStreaming: true } : m,
            ),
          );
        });
        updateAssistantMessage(assistantId, { isStreaming: false });
      } catch (err) {
        const errorText = err instanceof Error ? err.message : 'Ошибка генерации';
        updateAssistantMessage(assistantId, {
          text: `⚠ ${errorText}`,
          isStreaming: false,
        });
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

      const targets = resolveTargetModels(currentModels, payload.modelTokens);
      if (targets.length === 0) {
        setModelsError('Нет доступных моделей. Запустите бэкенд и проверьте /model/list.');
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: createId(),
          type: 'user',
          text,
          isMe: true,
        },
      ]);

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
        await runGeneration(model, text, assistantId);
      }
    },
    [apiModels, loadModels, runGeneration],
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
