export interface Chat {
  chat_id: number;
  name: string;
  description?: string | null;
  ai_models?: string[] | null;
  created_at: string;
  updated_at: string;
}
