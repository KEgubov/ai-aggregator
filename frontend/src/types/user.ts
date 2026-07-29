export interface UserProfile {
  user_id: number;
  username: string;
  email: string;
  about_me: string;
  created_at?: string | null;
  last_seen_at?: string | null;
}

export function initialsFromName(name: string): string {
  const local = name.trim() || '?';
  const parts = local.split(/[._\s-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  return local.slice(0, 2).toUpperCase() || '?';
}
