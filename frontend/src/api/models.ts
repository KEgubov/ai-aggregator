export interface ApiModel {
  model_id: number;
  display_name: string;
  description: string;
}

interface ModelsListResponse {
  status: string;
  models: ApiModel[];
}

export async function fetchModels(): Promise<ApiModel[]> {
  const res = await fetch('/models/list');
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
  return models.find((m) => m.display_name.toLowerCase() === normalized);
}

export function findModelById(models: ApiModel[], id: number): ApiModel | undefined {
  return models.find((m) => m.model_id === id);
}
