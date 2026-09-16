import { apiFetch } from './client';
import type { Chat, ChatMember, InvitePreview } from '../types/chat';

export async function fetchChats(): Promise<Chat[]> {
  // Backend returns list[ChatDTO] directly
  return apiFetch<Chat[]>('/chats/all');
}

export async function createChat(): Promise<Chat> {
  // Backend returns ChatDTO directly
  return apiFetch<Chat>('/chats/create', {
    method: 'POST',
  });
}

export async function deleteChat(chatId: number): Promise<void> {
  await apiFetch<{ status: string }>(`/chats/${chatId}`, {
    method: 'DELETE',
  });
}

export async function fetchChatMembers(chatId: number): Promise<ChatMember[]> {
  // Backend: GET /chats/{chat_id}/members (path param, not query)
  // Returns list[ChatMemberDTO] directly
  return apiFetch<ChatMember[]>(`/chats/${chatId}/members`);
}

interface InviteResponse {
  token: string;
}

/** Создаёт invite-токен для чата. Возвращает строку token. */
export async function createChatInvite(chatId: number): Promise<string> {
  const data = await apiFetch<InviteResponse>(`/chats/${chatId}/invite`, {
    method: 'POST',
  });
  return data.token;
}

/** Присоединяется к чату по invite-токену. */
export async function joinChat(token: string): Promise<Chat> {
  // Backend returns ChatDTO directly
  return apiFetch<Chat>(`/chats/join/${encodeURIComponent(token)}`, {
    method: 'POST',
  });
}

/** Возвращает название чата по invite-токену без вступления. */
export async function fetchInvitePreview(token: string): Promise<InvitePreview> {
  // Backend returns PreviewInviteDTO directly
  return apiFetch<InvitePreview>(`/chats/join/${encodeURIComponent(token)}`);
}

/** Переименовывает чат (только владелец). */
export async function renameChat(chatId: number, name: string): Promise<Chat> {
  const params = new URLSearchParams({ name });
  // Backend returns ChatDTO directly
  return apiFetch<Chat>(
    `/chats/${chatId}/rename?${params.toString()}`,
    { method: 'PATCH' },
  );
}
