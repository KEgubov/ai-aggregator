export interface Message {
  id: string;
  type: 'user' | 'ai';
  text: string;
  isMe?: boolean;
  modelName?: string;
  isStreaming?: boolean;
}

export function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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
