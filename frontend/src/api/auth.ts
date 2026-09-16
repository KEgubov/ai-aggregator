import { apiFetch } from './client';
import type { UserProfile } from '../types/user';

export interface RegisterPayload {
  email: string;
  password: string;
  about_me: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
}

export interface RegisteredUser {
  user_id: number;
  username: string;
  email: string;
  about_me: string;
}

export async function registerUser(payload: RegisterPayload): Promise<RegisteredUser> {
  // Backend returns UserDTO directly (no wrapper)
  return apiFetch<RegisteredUser>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function loginUser(payload: LoginPayload): Promise<void> {
  await apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function logoutUser(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST' });
}

export async function fetchProfile(): Promise<UserProfile> {
  // Backend returns UserProfileDTO directly (no wrapper)
  return apiFetch<UserProfile>('/users/profile');
}

export async function changeUsername(username: string): Promise<string> {
  // Backend: PATCH /users/profile/{username} (path param, not query)
  // Returns UserDTO; we extract the username field (string) as the component expects
  const data = await apiFetch<{ username: string }>(
    `/users/profile/${encodeURIComponent(username)}`,
    { method: 'PATCH' },
  );
  return data.username;
}
