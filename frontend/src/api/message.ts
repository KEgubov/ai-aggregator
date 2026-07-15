export async function streamMessage(
  chatId: number,
  modelId: number,
  text: string,
  onChunk: (chunk: string) => void,
): Promise<void> {
  const params = new URLSearchParams({
    chat_id: String(chatId),
    model_id: String(modelId),
    text,
  });

  const res = await fetch(`/message/send?${params.toString()}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const raw = await res.text().catch(() => '');
    let detail = raw;
    try {
      const payload = JSON.parse(raw) as { detail?: unknown };
      if (typeof payload.detail === 'string') {
        detail = payload.detail;
      }
    } catch {
      // keep raw text
    }
    throw new Error(detail || `Request failed: ${res.status}`);
  }
  if (!res.body) {
    throw new Error('Streaming body is empty');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
}
