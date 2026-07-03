const API_BASE = import.meta.env.VITE_API_URL ?? "";

/** GET /groq/chat?text=... — полный ответ Groq */
export async function fetchGroqChat(text: string): Promise<string> {
  const url = `${API_BASE}/groq/chat?${new URLSearchParams({ text })}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`);
  }

  const data: unknown = await response.json();
  if (typeof data !== "string") {
    throw new Error("Unexpected Groq API response format");
  }

  return data;
}

/** GET /groq/chat/stream?text=... — стриминговый ответ Groq */
export async function streamGroqChat(
  text: string,
  onChunk: (fullText: string) => void,
): Promise<string> {
  const url = `${API_BASE}/groq/chat/stream?${new URLSearchParams({ text })}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`);
  }

  if (!response.body) {
    throw new Error("Groq API stream is not supported in this browser");
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
