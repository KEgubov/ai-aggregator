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

export async function fetchChats(): Promise<Chat[]> {
  const data = await apiFetch<ChatsResponse>('/chat/all');
  return data.chats ?? [];
}

export async function createChat(): Promise<Chat> {
  const data = await apiFetch<CreateChatResponse>('/chat/create', {
    method: 'POST',
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

interface InviteResponse {
  status: string;
  token: string | { token: string };
}

/** Создаёт invite-токен для чата. Возвращает строку token. */
export async function createChatInvite(chatId: number): Promise<string> {
  const data = await apiFetch<InviteResponse>(`/chat/${chatId}/invite`, {
    method: 'POST',
  });
  const raw = data.token;
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw.token === 'string') return raw.token;
  throw new Error('Invite token missing in response');
}

interface JoinChatResponse {
  status: string;
  chat: Chat;
}

/** Присоединяется к чату по invite-токену. */
export async function joinChat(token: string): Promise<Chat> {
  const data = await apiFetch<JoinChatResponse>(`/chat/join/${encodeURIComponent(token)}`, {
    method: 'POST',
  });
  return data.chat;
}

interface RenameChatResponse {
  status: string;
  renamed_chat: Chat;
}

/** Переименовывает чат (только владелец). */
export async function renameChat(chatId: number, name: string): Promise<Chat> {
  const params = new URLSearchParams({ name });
  const data = await apiFetch<RenameChatResponse>(
    `/chat/${chatId}/rename?${params.toString()}`,
    { method: 'PATCH' },
  );
  return data.renamed_chat;
}
