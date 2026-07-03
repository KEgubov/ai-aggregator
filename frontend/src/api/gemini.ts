const API_BASE = import.meta.env.VITE_API_URL ?? "";

/** GET /gemini/chat?text=... — полный ответ Gemini */
export async function fetchGeminiChat(text: string): Promise<string> {
  const url = `${API_BASE}/gemini/chat?${new URLSearchParams({ text })}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data: unknown = await response.json();
  if (typeof data !== "string") {
    throw new Error("Unexpected Gemini API response format");
  }

  return data;
}

/** GET /gemini/chat/stream?text=... — стриминговый ответ Gemini */
export async function streamGeminiChat(
  text: string,
  onChunk: (fullText: string) => void,
): Promise<string> {
  const url = `${API_BASE}/gemini/chat/stream?${new URLSearchParams({ text })}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  if (!response.body) {
    throw new Error("Gemini API stream is not supported in this browser");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    fullText += decoder.decode(value, { stream: true });
    onChunk(fullText);
  }

  fullText += decoder.decode();
  if (fullText) {
    onChunk(fullText);
  }

  return fullText;
}

/** Разбивает ответ на абзацы для отображения в чате */
export function splitIntoParagraphs(text: string): string[] {
  const byDoubleNewline = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (byDoubleNewline.length > 1) return byDoubleNewline;

  const bySingleNewline = text
    .split(/\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return bySingleNewline.length > 0 ? bySingleNewline : [text.trim() || "Пустой ответ."];
}
