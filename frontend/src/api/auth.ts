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

interface RegisterResponse {
  status: string;
  user: {
    user_id: number;
    email: string;
    about_me: string;
  };
}

interface LoginResponse {
  access_token: string;
}

interface ProfileResponse {
  status: string;
  profile: UserProfile;
}

export async function registerUser(payload: RegisterPayload): Promise<RegisterResponse['user']> {
  const data = await apiFetch<RegisterResponse>('/user/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.user;
}

export async function loginUser(payload: LoginPayload): Promise<void> {
  await apiFetch<LoginResponse>('/user/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function logoutUser(): Promise<void> {
  await apiFetch('/user/logout', { method: 'POST' });
}

export async function fetchProfile(): Promise<UserProfile> {
  const data = await apiFetch<ProfileResponse>('/user/profile');
  return data.profile;
}
