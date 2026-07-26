export interface Message {
  id: string;
  type: 'user' | 'ai';
  text: string;
  isMe?: boolean;
  modelName?: string;
  isStreaming?: boolean;
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
  ai_model?: string | null;
  ai_provider?: string | null;
  path?: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export function mapMessageFromApi(dto: ApiMessage): Message {
  return {
    id: String(dto.message_id),
    type: dto.author_type === 'user' ? 'user' : 'ai',
    text: dto.content,
    isMe: dto.author_type === 'user',
    modelName: dto.ai_model ?? undefined,
    parentId: dto.parent_id,
    contextAnchor: dto.context_anchor,
    contextTextSnippet: dto.context_text_snippet,
  };
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
  return result.replace(/\s+/g, ' ').trim();
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
