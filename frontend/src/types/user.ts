export interface UserProfile {
  user_id: number;
  email: string;
  about_me: string;
  created_at?: string | null;
  last_seen_at?: string | null;
}

export function initialsFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email;
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  return local.slice(0, 2).toUpperCase() || '?';
}
