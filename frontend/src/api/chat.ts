import { fetchGeminiChat, splitIntoParagraphs, streamGeminiChat } from "./gemini";
import { fetchGroqChat, streamGroqChat } from "./groq";

export type ConnectedModelId = "gemini" | "groq";

const CONNECTED_MODEL_LABELS: Record<ConnectedModelId, string> = {
  gemini: "Gemini 3.5 Flash",
  groq: "Llama 3.3 · Groq",
};

export function isConnectedModel(model: string): model is ConnectedModelId {
  return model === "gemini" || model === "groq";
}

export async function fetchModelResponse(
  model: string,
  prompt: string,
  streaming: boolean,
  onStreamUpdate?: (paragraphs: string[]) => void,
): Promise<string[]> {
  if (model === "gemini") {
    const text = streaming
      ? await streamGeminiChat(prompt, (fullText) => {
          onStreamUpdate?.(splitIntoParagraphs(fullText));
        })
      : await fetchGeminiChat(prompt);
    return splitIntoParagraphs(text);
  }

  if (model === "groq") {
    const text = streaming
      ? await streamGroqChat(prompt, (fullText) => {
          onStreamUpdate?.(splitIntoParagraphs(fullText));
        })
      : await fetchGroqChat(prompt);
    return splitIntoParagraphs(text);
  }

  return [
    `Модель ${model} пока не подключена к backend.`,
    `Выберите ${CONNECTED_MODEL_LABELS.gemini} или ${CONNECTED_MODEL_LABELS.groq}.`,
  ];
}
