export interface Chat {
  chat_id: number;
  name: string;
  description?: string | null;
  ai_models?: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMember {
  username: string;
  about_me: string;
  is_owner: boolean;
}

export interface InvitePreview {
  name: string;
  description?: string | null;
  already_member: boolean;
}
