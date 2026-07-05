export type ChatProvider = "groq" | "gemini";

const MODEL_PROVIDERS: Record<string, ChatProvider> = {
  gemini: "gemini",
  gpt4o: "groq",
  claude: "groq",
  deepseek: "groq",
  llama: "groq",
  grok: "groq",
};

export function resolveProvider(modelId: string): ChatProvider {
  return MODEL_PROVIDERS[modelId] ?? "groq";
}
