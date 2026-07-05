import { useRef, useEffect, useState, useCallback } from "react";
import BranchIcon from "./cyber/BranchIcon";
import ChatInputWithSuggestions, { type InlineToken } from "./ChatInputWithSuggestions";
import ChatStream, { MOCK_MESSAGES, type ChatMessage } from "./ChatStream";
import { streamChat, ChatStreamError } from "../api/chat";
import { resolveProvider } from "../config/models";

const DMITRY = {
  id: "dmitry",
  name: "Дмитрий",
  type: "user" as const,
  color: "#059669",
  initials: "Д",
};

function buildMessageTokens(text: string, tokens: InlineToken[]) {
  if (tokens.length === 0) return [{ kind: "text" as const, value: text }];

  const parts: Array<
    | { kind: "text"; value: string }
    | { kind: "ai-mention"; name: string }
    | { kind: "user-mention"; name: string }
  > = [];
  let cursor = 0;

  for (const token of tokens) {
    const marker = `@${token.label}`;
    const idx = text.indexOf(marker, cursor);
    if (idx === -1) continue;
    if (idx > cursor) parts.push({ kind: "text", value: text.slice(cursor, idx) });
    parts.push(
      token.kind === "model"
        ? { kind: "ai-mention", name: token.label }
        : { kind: "user-mention", name: token.label },
    );
    cursor = idx + marker.length;
  }
  if (cursor < text.length) parts.push({ kind: "text", value: text.slice(cursor) });
  return parts.length > 0 ? parts : [{ kind: "text" as const, value: text }];
}

function SidebarIcon({
  children,
  active = false,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={`relative flex size-10 items-center justify-center rounded-full transition-all duration-200 ${
        active ? "text-[#ffbc50]" : "text-[#d9d9d9]/50 hover:text-[#d9d9d9]"
      }`}
    >
      {active && (
        <span className="absolute -left-[13px] top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[#ffbc50]" />
      )}
      {children}
    </button>
  );
}

function NavFolderIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M2 5.5A1.5 1.5 0 013.5 4H7l1.5 2h6A1.5 1.5 0 0116 7.5v6A1.5 1.5 0 0114.5 15h-11A1.5 1.5 0 012 13.5v-8z"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}

function NavChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M3 4.5A1.5 1.5 0 014.5 3h9A1.5 1.5 0 0115 4.5v6A1.5 1.5 0 0113.5 12H7l-3 3v-3H4.5A1.5 1.5 0 013 10.5v-6z"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}

function NavBookmarkIcon() {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" fill="none" aria-hidden>
      <path
        d="M4 2.5A1.5 1.5 0 015.5 1h5A1.5 1.5 0 0112 2.5V16l-4-2.5L4 16V2.5z"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  );
}

export default function CyberChat() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
  const [isStreaming, setIsStreaming] = useState(false);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const appendAiChunk = useCallback((aiMsgId: string, chunk: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== aiMsgId || m.kind !== "ai") return m;
        const paragraphs = [...m.paragraphs];
        const last = paragraphs[paragraphs.length - 1];
        paragraphs[paragraphs.length - 1] = { ...last, text: last.text + chunk };
        return { ...m, paragraphs };
      }),
    );
  }, []);

  const requestAiResponse = useCallback(
    async (prompt: string, modelToken: InlineToken) => {
      const modelId = modelToken.modelId ?? "llama";
      const provider = resolveProvider(modelId);
      const aiMsgId = `ai-${Date.now()}`;

      setIsStreaming(true);
      setMessages((prev) => [
        ...prev,
        {
          id: aiMsgId,
          kind: "ai" as const,
          modelName: modelToken.label,
          isStreaming: true,
          paragraphs: [{ id: `${aiMsgId}-p-1`, text: "" }],
        },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamChat(provider, prompt, (chunk) => appendAiChunk(aiMsgId, chunk), controller.signal);
      } catch (err) {
        const message =
          err instanceof ChatStreamError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Не удалось получить ответ";
        if ((err as Error).name !== "AbortError") {
          appendAiChunk(aiMsgId, message.startsWith("Ошибка") ? message : `\n\nОшибка: ${message}`);
        }
      } finally {
        abortRef.current = null;
        setIsStreaming(false);
        setMessages((prev) =>
          prev.map((m) => (m.id === aiMsgId && m.kind === "ai" ? { ...m, isStreaming: false } : m)),
        );
      }
    },
    [appendAiChunk],
  );

  const handleSend = useCallback(
    ({ text, tokens }: { text: string; tokens: InlineToken[] }) => {
      const msg: ChatMessage = {
        id: `u-self-${Date.now()}`,
        kind: "user",
        isSelf: true,
        author: DMITRY,
        tokens: buildMessageTokens(text, tokens),
      };
      setMessages((prev) => [...prev, msg]);

      const modelToken = tokens.find((t) => t.kind === "model");
      if (modelToken) {
        void requestAiResponse(text, modelToken);
      }
    },
    [requestAiResponse],
  );

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return (
    <div className="flex h-screen w-full min-w-[1280px] bg-cyber-shell text-[15px] leading-5 text-[#d9d9d9]">
      {/* Sidebar — 72px */}
      <aside className="flex w-[72px] shrink-0 flex-col items-center gap-6 bg-cyber-sidebar pb-2 pt-[22px]">
        <SidebarIcon active>
          <span className="text-lg font-light">∞</span>
        </SidebarIcon>
        <span className="size-1.5 rounded-full bg-[#d9d9d9]/30" />
        <div className="flex flex-col gap-2">
          <SidebarIcon active>
            <NavFolderIcon />
          </SidebarIcon>
          <SidebarIcon>
            <NavChatIcon />
          </SidebarIcon>
        </div>
        <span className="size-1.5 rounded-full bg-[#d9d9d9]/30" />
        <SidebarIcon>
          <NavBookmarkIcon />
        </SidebarIcon>
        <SidebarIcon>
          <BranchIcon size={20} className="opacity-40" />
        </SidebarIcon>

        <div className="mt-auto flex flex-col items-center gap-4 pb-4">
          <div className="relative">
            <div className="flex size-8 items-center justify-center rounded-full bg-[#6366f1] text-xs text-white">
              Е
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full border-2 border-cyber-sidebar bg-cyber-sidebar text-[10px] font-bold text-cyber-accent">
              2
            </span>
          </div>
          <div className="flex size-8 items-center justify-center rounded-full bg-[#059669] text-xs text-white">
            Д
          </div>
          <div className="relative">
            <div className="flex size-8 items-center justify-center rounded-full bg-[#7c3aed] text-xs text-white">
              В
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full border-2 border-cyber-sidebar bg-cyber-sidebar text-[10px] font-bold text-cyber-accent">
              1
            </span>
          </div>
          <button type="button" className="text-[#d9d9d9]/40 hover:text-[#d9d9d9]">
            •••
          </button>
          <span className="size-1.5 rounded-full bg-[#d9d9d9]/30" />
          <div className="flex size-10 items-center justify-center rounded-full bg-[#d97757] text-sm text-white">
            K
          </div>
        </div>
      </aside>

      {/* Main — flex-1, chat column 600px centered inside */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-4">
          <span className="text-sm leading-5 text-[#d9d9d9]/60">Проектная документация</span>
          <div className="flex items-center gap-1.5 whitespace-nowrap pr-[72px]">
            <span className="size-3 shrink-0 rounded-full bg-cyber-accent" />
            <span className="text-xs font-bold text-white">5 378</span>
          </div>
        </header>

        <div className="mx-auto flex h-full w-full max-w-[720px] flex-col px-6 pb-6 pt-14">
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto pb-4">
            <ChatStream
              messages={messages}
              onThreadOpen={(id) => console.log("[ChatStream] onThreadOpen:", id)}
            />
          </div>

          <div className="relative shrink-0 pt-2">
            <div className="pointer-events-none absolute -top-10 left-0 right-0 h-10 bg-gradient-to-t from-cyber-shell to-transparent" />
            <ChatInputWithSuggestions onSend={handleSend} disabled={isStreaming} />
          </div>
        </div>
      </div>

      {/* Right gutter — 72px (Figma Frame 28) */}
      <div className="w-[72px] shrink-0" aria-hidden />
    </div>
  );
}
