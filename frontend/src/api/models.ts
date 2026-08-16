import { ApiError, apiFetch } from './client';

export interface ApiModel {
  model_id: number;
  model_name: string;
  display_name: string;
  description: string;
}

interface ModelsListResponse {
  status: string;
  models: ApiModel[];
}

interface LinkedModelsResponse {
  status: string;
  linked_models: string[] | { ai_models?: string[] | null } | null;
}

export async function fetchModels(): Promise<ApiModel[]> {
  const res = await fetch('/model/list', {
    credentials: 'include',
  });
  if (!res.ok) {
    let detail = `Failed to load models: ${res.status}`;
    try {
      const payload = await res.json();
      if (typeof payload?.detail === 'string') {
        detail = payload.detail;
      }
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(detail);
  }
  const data: ModelsListResponse = await res.json();
  return data.models ?? [];
}

function parseLinkedNames(raw: LinkedModelsResponse['linked_models']): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter((name): name is string => typeof name === 'string' && name.length > 0);
  }
  const names = raw.ai_models;
  if (!Array.isArray(names)) return [];
  return names.filter((name): name is string => typeof name === 'string' && name.length > 0);
}

/** Актуальные модели, привязанные к чату. 404 (чат без моделей) → []. */
export async function fetchLinkedModels(chatId: number): Promise<string[]> {
  try {
    const data = await apiFetch<LinkedModelsResponse>(`/model/linked?chat_id=${chatId}`);
    return parseLinkedNames(data.linked_models);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return [];
    throw err;
  }
}

export function findModelByName(models: ApiModel[], name: string): ApiModel | undefined {
  const normalized = name.trim().toLowerCase();
  return (
    models.find((m) => m.display_name.toLowerCase() === normalized) ??
    models.find((m) => m.model_name.toLowerCase() === normalized)
  );
}

/** Всегда отдаём display_name: и для старых сообщений с model_name API. */
export function resolveModelDisplayName(
  models: ApiModel[],
  storedName?: string | null,
): string | undefined {
  if (!storedName) return undefined;
  const found = findModelByName(models, storedName);
  return found?.display_name ?? storedName;
}

export function findModelById(models: ApiModel[], id: number): ApiModel | undefined {
  return models.find((m) => m.model_id === id);
}

const NON_CHAT_MODEL_RE =
  /guard|moderation|classifier|embed|whisper|tts|orpheus|speech-to|text-to-speech|safety/i;

/** Каталог для чата: без модерации, эмбеддингов и TTS. */
export function isChatModel(model: ApiModel): boolean {
  return !NON_CHAT_MODEL_RE.test(model.display_name) && !NON_CHAT_MODEL_RE.test(model.model_name);
}

/** Резолвит @-токены моделей в записи каталога. */
export function resolveTargetModels(apiModels: ApiModel[], modelTokens: string[]): ApiModel[] {
  if (modelTokens.length === 0) return [];
  return modelTokens
    .map((name) => findModelByName(apiModels, name))
    .filter((model): model is ApiModel => Boolean(model));
}
