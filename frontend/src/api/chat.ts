import { apiFetch } from './client';
import type { Chat, ChatMember } from '../types/chat';

interface ChatsResponse {
  status: string;
  chats: Chat[];
}

interface CreateChatResponse {
  status: string;
  chat: Chat;
}

interface MembersResponse {
  status: string;
  members: ChatMember[];
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

interface DeleteChatResponse {
  status: string;
}

export async function deleteChat(chatId: number): Promise<void> {
  await apiFetch<DeleteChatResponse>(`/chat/${chatId}`, {
    method: 'DELETE',
  });
}

export async function fetchChatMembers(chatId: number): Promise<ChatMember[]> {
  const data = await apiFetch<MembersResponse>(`/chat/members?chat_id=${chatId}`);
  return data.members ?? [];
}
