import { apiFetch } from './client';

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
