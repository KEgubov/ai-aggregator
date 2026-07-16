import { apiFetch } from './client';
import type { Chat } from '../types/chat';

interface ChatsResponse {
  status: string;
  chats: Chat[];
}

interface CreateChatResponse {
  status: string;
  chat: Chat;
}

export interface CreateChatPayload {
  name: string;
  description?: string | null;
}

export async function fetchChats(): Promise<Chat[]> {
  const data = await apiFetch<ChatsResponse>('/chat/all');
  return data.chats ?? [];
}

export async function createChat(payload: CreateChatPayload): Promise<Chat> {
  const data = await apiFetch<CreateChatResponse>('/chat/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.chat;
}
