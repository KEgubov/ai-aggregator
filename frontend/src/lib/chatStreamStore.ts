import { sendChatMessage, streamMessage } from '../api/message';
import type { Message } from '../types/message';

export type ChatStreamStatus = 'running' | 'completed' | 'error';

export interface ChatStreamSnapshot {
  chatId: number;
  status: ChatStreamStatus;
  userText: string;
  assistantText: string;
  modelName: string | null;
  error: string | null;
  localUserId: string;
  localAssistantId: string | null;
}

export interface StartChatGenerationOptions {
  chatId: number;
  content: string;
  parentId?: number;
  modelId?: number;
  modelName?: string | null;
}

const snapshots = new Map<number, ChatStreamSnapshot>();
const listeners = new Map<number, Set<() => void>>();

export function subscribeChatStream(chatId: number, listener: () => void): () => void {
  let set = listeners.get(chatId);
  if (!set) {
    set = new Set();
    listeners.set(chatId, set);
  }
  set.add(listener);
  return () => {
    set!.delete(listener);
    if (set!.size === 0) listeners.delete(chatId);
  };
}

export function getChatStream(chatId: number): ChatStreamSnapshot | null {
  return snapshots.get(chatId) ?? null;
}

export function isChatStreaming(chatId: number): boolean {
  const status = snapshots.get(chatId)?.status;
  return status === 'running' || status === 'completed';
}

export function clearChatStream(chatId: number): void {
  if (!snapshots.has(chatId)) return;
  snapshots.delete(chatId);
  emit(chatId);
}

export function startChatGeneration(options: StartChatGenerationOptions): boolean {
  if (isChatStreaming(options.chatId)) return false;

  const localUserId = `local-user-${options.chatId}-${Date.now()}`;
  const localAssistantId =
    options.modelId != null ? `local-ai-${options.chatId}-${Date.now()}` : null;

  snapshots.set(options.chatId, {
    chatId: options.chatId,
    status: 'running',
    userText: options.content,
    assistantText: '',
    modelName: options.modelName ?? null,
    error: null,
    localUserId,
    localAssistantId,
  });
  emit(options.chatId);
  void runGeneration(options);
  return true;
}

export function messagesWithStream(
  server: Message[],
  stream: ChatStreamSnapshot | null,
): Message[] {
  if (!stream) return server;

  // Отправка без модели не сохранилась — не рисуем оптимистичный пузырь.
  if (stream.status === 'error' && !stream.localAssistantId) {
    return server;
  }

  const last = server[server.length - 1];
  const lastUser = findLastOwnUser(server);
  const userOnServer = lastUser?.text === stream.userText;
  const assistantOnServer = Boolean(
    stream.localAssistantId && last?.type === 'ai' && !last.isStreaming,
  );

  if (stream.status === 'completed' && userOnServer && (!stream.localAssistantId || assistantOnServer)) {
    return server;
  }

  const extra: Message[] = [];
  if (!userOnServer) {
    extra.push({
      id: stream.localUserId,
      type: 'user',
      text: stream.userText,
      isMe: true,
    });
  }

  if (stream.localAssistantId) {
    extra.push({
      id: stream.localAssistantId,
      type: 'ai',
      text: stream.error ? `⚠ ${stream.error}` : stream.assistantText,
      modelName: stream.modelName ?? undefined,
      isStreaming: stream.status === 'running',
    });
  }

  return extra.length > 0 ? [...server, ...extra] : server;
}

function findLastOwnUser(messages: Message[]): Message | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.type === 'user' && message.isMe) return message;
  }
  return undefined;
}

function emit(chatId: number): void {
  const set = listeners.get(chatId);
  if (set && set.size > 0) {
    set.forEach((fn) => fn());
    return;
  }
  // Никто не смотрит чат — completed можно выбросить, ответ уже в БД.
  if (snapshots.get(chatId)?.status === 'completed') {
    snapshots.delete(chatId);
  }
}

function patch(chatId: number, partial: Partial<ChatStreamSnapshot>): void {
  const current = snapshots.get(chatId);
  if (!current) return;
  snapshots.set(chatId, { ...current, ...partial });
  emit(chatId);
}

async function runGeneration(options: StartChatGenerationOptions): Promise<void> {
  const { chatId, content, parentId, modelId } = options;
  try {
    if (modelId == null) {
      await sendChatMessage({ chatId, content, parentId });
      patch(chatId, { status: 'completed' });
      return;
    }

    await streamMessage({ chatId, modelId, content, parentId }, (chunk) => {
      const current = snapshots.get(chatId);
      if (!current || current.status !== 'running') return;
      snapshots.set(chatId, {
        ...current,
        assistantText: current.assistantText + chunk,
      });
      emit(chatId);
    });

    const current = snapshots.get(chatId);
    if (current?.status === 'running') {
      patch(chatId, { status: 'completed' });
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Не удалось отправить сообщение';
    patch(chatId, { status: 'error', error });
  }
}
