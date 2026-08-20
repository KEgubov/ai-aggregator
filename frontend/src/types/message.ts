import { initialsFromName } from './user';

export interface Message {
  id: string;
  type: 'user' | 'ai';
  text: string;
  isMe?: boolean;
  /** Инициалы автора (для чужих сообщений). */
  authorInitials?: string;
  /** Имя автора (для чипа «ответ на…»). */
  authorName?: string;
  modelName?: string;
  isStreaming?: boolean;
  createdAt?: string;
  parentId?: number | null;
  contextAnchor?: string | null;
  contextTextSnippet?: string | null;
}

export interface ApiMessage {
  message_id: number;
  chat_id: number;
  content: string;
  parent_id?: number | null;
  context_anchor?: string | null;
  context_text_snippet?: string | null;
  author_id?: number | null;
  author_type: 'user' | 'assistant' | 'system';
  username?: string | null;
  ai_model?: string | null;
  ai_provider?: string | null;
  path?: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export function mapMessageFromApi(
  dto: ApiMessage,
  currentUserId?: number | null,
): Message {
  const isUser = dto.author_type === 'user';
  const isMe =
    isUser &&
    currentUserId != null &&
    dto.author_id != null &&
    dto.author_id === currentUserId;

  return {
    id: String(dto.message_id),
    type: isUser ? 'user' : 'ai',
    text: dto.content,
    isMe,
    authorInitials: dto.username ? initialsFromName(dto.username) : undefined,
    authorName: dto.username ?? undefined,
    modelName: dto.ai_model ?? undefined,
    createdAt: dto.created_at,
    parentId: dto.parent_id,
    contextAnchor: dto.context_anchor,
    contextTextSnippet: dto.context_text_snippet,
  };
}

/** «сегодня, 18:11» / «вчера, 14:30» / «27 июля, 18:11» */
export function formatMessageDate(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const time = date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMsg = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfMsg.getTime()) / 86_400_000);

  if (diffDays === 0) return `сегодня, ${time}`;
  if (diffDays === 1) return `вчера, ${time}`;

  const dayMonth = date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  });
  return `${dayMonth}, ${time}`;
}

export function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Последний message_id с сервера — явный parent для следующего сообщения. */
export function getLastServerMessageId(messages: Message[]): number | undefined {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const id = Number(messages[i].id);
    if (Number.isInteger(id) && id > 0) {
      return id;
    }
  }
  return undefined;
}

export function stripMentionTokens(
  text: string,
  modelTokens: string[],
  memberTokens: string[] = [],
): string {
  let result = text;
  for (const token of [...modelTokens, ...memberTokens]) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'gi'), '');
  }
  return result.replace(/[ \t]+$/gm, '').trim();
}

export function splitIntoParagraphs(text: string): { id: string; text: string }[] {
  const parts = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0 && text.trim()) {
    return [{ id: createId(), text: text.trim() }];
  }

  return parts.map((part) => ({ id: createId(), text: part }));
}
