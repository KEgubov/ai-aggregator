import { apiFetch } from './client';
import type { Chat, ChatMember, InvitePreview } from '../types/chat';

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
  const data = await apiFetch<ChatsResponse>('/chats/all');
  return data.chats ?? [];
}

export async function createChat(): Promise<Chat> {
  const data = await apiFetch<CreateChatResponse>('/chats/create', {
    method: 'POST',
  });
  return data.chat;
}

interface DeleteChatResponse {
  status: string;
}

export async function deleteChat(chatId: number): Promise<void> {
  await apiFetch<DeleteChatResponse>(`/chats/${chatId}`, {
    method: 'DELETE',
  });
}

export async function fetchChatMembers(chatId: number): Promise<ChatMember[]> {
  const data = await apiFetch<MembersResponse>(`/chats/members?chat_id=${chatId}`);
  return data.members ?? [];
}

interface InviteResponse {
  status: string;
  token: string | { token: string };
}

/** Создаёт invite-токен для чата. Возвращает строку token. */
export async function createChatInvite(chatId: number): Promise<string> {
  const data = await apiFetch<InviteResponse>(`/chats/${chatId}/invite`, {
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
  const data = await apiFetch<JoinChatResponse>(`/chats/join/${encodeURIComponent(token)}`, {
    method: 'POST',
  });
  return data.chat;
}

interface InvitePreviewResponse {
  status: string;
  invite: InvitePreview;
}

/** Возвращает название чата по invite-токену без вступления. */
export async function fetchInvitePreview(token: string): Promise<InvitePreview> {
  const data = await apiFetch<InvitePreviewResponse>(
    `/chats/join/${encodeURIComponent(token)}`,
  );
  return data.invite;
}

interface RenameChatResponse {
  status: string;
  renamed_chat: Chat;
}

/** Переименовывает чат (только владелец). */
export async function renameChat(chatId: number, name: string): Promise<Chat> {
  const params = new URLSearchParams({ name });
  const data = await apiFetch<RenameChatResponse>(
    `/chats/${chatId}/rename?${params.toString()}`,
    { method: 'PATCH' },
  );
  return data.renamed_chat;
}
