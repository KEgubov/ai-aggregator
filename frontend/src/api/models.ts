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
