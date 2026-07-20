import { apiFetch } from './client';
import type { ApiMessage } from '../types/message';

interface MessagesResponse {
  status: string;
  messages: ApiMessage[];
}

export interface ChatMessageOptions {
  chatId: number;
  content: string;
  parentId?: number;
  contextAnchor?: string;
  contextTextSnippet?: string;
}

export interface SendMessageOptions extends ChatMessageOptions {
  modelId: number;
}

function buildMessageBody(options: ChatMessageOptions & { modelId?: number }) {
  return {
    chat_id: options.chatId,
    content: options.content,
    model_id: options.modelId ?? null,
    parent_id: options.parentId ?? null,
    context_anchor: options.contextAnchor ?? null,
    context_text_snippet: options.contextTextSnippet ?? null,
  };
}

export async function fetchMessages(chatId: number): Promise<ApiMessage[]> {
  const data = await apiFetch<MessagesResponse>(`/message/?chat_id=${chatId}`);
  return data.messages ?? [];
}

function parseErrorDetail(raw: string, status: number): string {
  if (!raw) return `Request failed: ${status}`;
  try {
    const payload = JSON.parse(raw) as { detail?: unknown };
    if (typeof payload.detail === 'string') return payload.detail;
    if (Array.isArray(payload.detail)) {
      return payload.detail
        .map((item) =>
          typeof item === 'object' && item && 'msg' in item ? String(item.msg) : String(item),
        )
        .join(', ');
    }
  } catch {
    // keep raw text
  }
  return raw;
}

export async function sendChatMessage(options: ChatMessageOptions): Promise<void> {
  const res = await fetch('/message/send', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildMessageBody(options)),
  });
  if (!res.ok) {
    const raw = await res.text().catch(() => '');
    throw new Error(parseErrorDetail(raw, res.status));
  }
}

export async function streamMessage(
  options: SendMessageOptions,
  onChunk: (chunk: string) => void,
): Promise<void> {
  const res = await fetch('/message/send', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildMessageBody(options)),
  });
  if (!res.ok) {
    const raw = await res.text().catch(() => '');
    throw new Error(parseErrorDetail(raw, res.status));
  }
  if (!res.body) {
    throw new Error('Streaming body is empty');
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    throw new Error('Expected streaming response from AI');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}
