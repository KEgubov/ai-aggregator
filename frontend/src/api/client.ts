export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function parseErrorDetail(res: Response): Promise<string> {
  const raw = await res.text().catch(() => '');
  if (!raw) return `Request failed: ${res.status}`;
  try {
    const payload = JSON.parse(raw) as { detail?: unknown };
    if (typeof payload.detail === 'string') return payload.detail;
    if (Array.isArray(payload.detail)) {
      return payload.detail
        .map((item) => (typeof item === 'object' && item && 'msg' in item ? String(item.msg) : String(item)))
        .join(', ');
    }
  } catch {
    // keep raw text
  }
  return raw;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!res.ok) {
    throw new ApiError(await parseErrorDetail(res), res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}
