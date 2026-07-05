import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import MicrophoneIcon from "./cyber/MicrophoneIcon";
import SendIcon from "./cyber/SendIcon";

// ─── Types ───────────────────────────────────────────────────────────────────

type SuggestionKind = "model" | "member";

interface ModelOption {
  id: string;
  kind: "model";
  name: string;
  subtitle: string;
  cost: number;
  color: string;
  glyph: string;
}

interface MemberOption {
  id: string;
  kind: "member";
  name: string;
  subtitle: string;
  color: string;
  initials: string;
}

type SuggestionOption = ModelOption | MemberOption;

export interface InlineToken {
  id: string;
  kind: SuggestionKind;
  label: string;
  color?: string;
  initials?: string;
  glyph?: string;
  modelId?: string;
}

interface TextSegment {
  type: "text";
  value: string;
}

interface TokenSegment {
  type: "token";
  token: InlineToken;
}

type Segment = TextSegment | TokenSegment;

export interface ChatInputWithSuggestionsProps {
  onSend?: (payload: { text: string; tokens: InlineToken[] }) => void;
  className?: string;
  disabled?: boolean;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const MODELS: ModelOption[] = [
  { id: "gpt4o", kind: "model", name: "GPT-4o", subtitle: "Smart", cost: 2, color: "#10a37f", glyph: "G" },
  { id: "claude", kind: "model", name: "Claude 3.5 Sonnet", subtitle: "Coding", cost: 2, color: "#d97757", glyph: "C" },
  { id: "gemini", kind: "model", name: "Gemini 1.5 Pro", subtitle: "Context", cost: 1, color: "#4285f4", glyph: "✦" },
  { id: "deepseek", kind: "model", name: "DeepSeek-R1", subtitle: "Reasoning", cost: 1, color: "#6366f1", glyph: "D" },
  { id: "llama", kind: "model", name: "Llama 3.1 70B", subtitle: "Free / Fast", cost: 0, color: "#f55036", glyph: "L" },
  { id: "grok", kind: "model", name: "Grok 3", subtitle: "Real-time / X Data", cost: 3, color: "#ffbc50", glyph: "𝕏" },
];

const MEMBERS: MemberOption[] = [
  { id: "elena", kind: "member", name: "Елена", subtitle: "Системный аналитик", color: "#6366f1", initials: "Е" },
  { id: "dmitry", kind: "member", name: "Дмитрий", subtitle: "Lead DevOps", color: "#059669", initials: "Д" },
  { id: "viktor", kind: "member", name: "Виктор", subtitle: "Frontend", color: "#7c3aed", initials: "В" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function segmentsToPlainText(segments: Segment[]): string {
  return segments
    .map((s) => (s.type === "text" ? s.value : `@${s.token.label} `))
    .join("");
}

function ensureTrailingText(segments: Segment[]): Segment[] {
  if (segments.length === 0) return [{ type: "text", value: "" }];
  const last = segments[segments.length - 1];
  if (last.type === "text") return segments;
  return [...segments, { type: "text", value: "" }];
}

function getDraftText(segments: Segment[]): string {
  const normalized = ensureTrailingText(segments);
  for (let i = normalized.length - 1; i >= 0; i--) {
    const seg = normalized[i];
    if (seg.type === "text") return seg.value;
  }
  return "";
}

function findActiveMention(segments: Segment[]): { query: string; segmentIndex: number } | null {
  const normalized = ensureTrailingText(segments);
  for (let i = normalized.length - 1; i >= 0; i--) {
    const seg = normalized[i];
    if (seg.type !== "text") continue;
    const match = seg.value.match(/@([^\s@]*)$/);
    if (match) return { query: match[1], segmentIndex: i };
  }
  return null;
}

function renderHighlightedText(text: string): ReactNode[] {
  if (!text) return [];
  const parts = text.split(/(@[^\s@]*)/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="text-[#ffbc50]">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

function CoinBadge({ cost }: { cost: number }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-white">
      <span className="size-3 rounded-full bg-[#ffbc50]" />
      {cost}
    </span>
  );
}

function SuggestionMenu({
  query,
  onSelect,
  style,
}: {
  query: string;
  onSelect: (option: SuggestionOption) => void;
  style?: CSSProperties;
}) {
  const q = query.toLowerCase();
  const filteredModels = MODELS.filter(
    (m) => !q || m.name.toLowerCase().includes(q) || m.id.includes(q),
  );
  const filteredMembers = MEMBERS.filter(
    (m) => !q || m.name.toLowerCase().includes(q) || m.initials.toLowerCase().includes(q),
  );

  const showModels = filteredModels.length > 0;
  const showMembers = filteredMembers.length > 0;

  if (!showModels && !showMembers) return null;

  return (
    <div
      style={style}
      className="absolute bottom-full left-0 z-20 mb-2 w-full overflow-hidden rounded-2xl bg-[#18181C] py-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
    >
      {showModels && (
        <>
          <p className="px-4 pb-1 text-[11px] font-medium uppercase tracking-wide text-[#d9d9d9]/40">
            ИИ-МОДЕЛИ
          </p>
          {filteredModels.map((model) => (
            <button
              key={model.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSelect(model)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-all duration-200 hover:bg-white/[0.06]"
            >
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-[#ffbc50]"
                style={{ backgroundColor: `${model.color}33` }}
              >
                {model.glyph}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] leading-5 text-[#d9d9d9]">{model.name}</span>
                <span className="block text-xs leading-4 text-[#d9d9d9]/40">{model.subtitle}</span>
              </span>
              <CoinBadge cost={model.cost} />
            </button>
          ))}
        </>
      )}

      {showModels && showMembers && <div className="my-2 h-px bg-white/[0.05]" />}

      {showMembers && (
        <>
          <p className="px-4 pb-1 text-[11px] font-medium uppercase tracking-wide text-[#d9d9d9]/40">
            УЧАСТНИКИ КОМАНДЫ
          </p>
          {filteredMembers.map((member) => (
            <button
              key={member.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSelect(member)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-all duration-200 hover:bg-white/[0.06]"
            >
              <span
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs text-white"
                style={{ backgroundColor: member.color }}
              >
                {member.initials}
              </span>
              <span>
                <span className="block text-[15px] leading-5 text-[#d9d9d9]">{member.name}</span>
                <span className="block text-xs leading-4 text-[#d9d9d9]/40">{member.subtitle}</span>
              </span>
            </button>
          ))}
        </>
      )}
    </div>
  );
}

function InlineTokenBadge({ token }: { token: InlineToken }) {
  if (token.kind === "model") {
    return (
      <span
        contentEditable={false}
        className="mx-0.5 inline-flex items-center gap-1 rounded-full bg-[#252525] py-0.5 pl-1 pr-2 text-[15px] leading-5"
      >
        <span className="flex size-5 items-center justify-center rounded-full bg-[#ffbc50]/20 text-[10px] text-[#ffbc50]">
          {token.glyph ?? "✦"}
        </span>
        <span className="text-[#ffbc50]">{token.label}</span>
      </span>
    );
  }
  return (
    <span
      contentEditable={false}
      className="mx-0.5 inline-flex items-center gap-1 rounded-full bg-[#252525] py-0.5 pl-1 pr-2 text-[15px] leading-5"
    >
      <span
        className="flex size-5 items-center justify-center rounded-full text-[9px] text-white"
        style={{ backgroundColor: token.color }}
      >
        {token.initials}
      </span>
      <span className="text-[#ffbc50]">{token.label}</span>
    </span>
  );
}

function IconCircleButton({
  children,
  onClick,
  className = "",
  label,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex size-10 shrink-0 items-center justify-center rounded-full bg-[#3a3a3a] text-white/55 transition-all duration-200 hover:bg-[#4a4a4a] ${className}`}
    >
      {children}
    </button>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function ChatInputWithSuggestions({
  onSend,
  className = "",
  disabled = false,
}: ChatInputWithSuggestionsProps) {
  const [focused, setFocused] = useState(false);
  const [segments, setSegments] = useState<Segment[]>([{ type: "text", value: "" }]);
  const [menuLeft, setMenuLeft] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const caretProbeRef = useRef<HTMLSpanElement>(null);

  const normalizedSegments = useMemo(() => ensureTrailingText(segments), [segments]);
  const activeMention = useMemo(() => findActiveMention(normalizedSegments), [normalizedSegments]);
  const menuOpen = Boolean(activeMention);
  const menuQuery = activeMention?.query ?? "";

  const tokens = normalizedSegments
    .filter((s): s is TokenSegment => s.type === "token")
    .map((s) => s.token);
  const activeModel = tokens.find((t) => t.kind === "model");
  const hasMemberToken = tokens.some((t) => t.kind === "member");
  const draftText = getDraftText(normalizedSegments);
  const hasContent =
    tokens.length > 0 || draftText.trim().length > 0 || normalizedSegments.some(
      (s) => s.type === "text" && s.value.length > 0,
    );

  const expanded = focused || hasContent || menuOpen;

  const updateDraft = useCallback((value: string) => {
    setSegments((prev) => {
      const next = ensureTrailingText([...prev]);
      const lastIdx = next.length - 1;
      next[lastIdx] = { type: "text", value };
      return next;
    });
  }, []);

  const insertToken = useCallback((option: SuggestionOption) => {
    setSegments((prev) => {
      const next = ensureTrailingText([...prev]);
      const mention = findActiveMention(next);
      if (!mention) return next;

      const textSeg = next[mention.segmentIndex];
      if (textSeg.type !== "text") return next;

      const before = textSeg.value.replace(/@([^\s@]*)$/, "");
      const token: InlineToken = {
        id: `${option.id}-${Date.now()}`,
        kind: option.kind,
        label: option.name,
        color: option.kind === "member" ? option.color : undefined,
        initials: option.kind === "member" ? option.initials : undefined,
        glyph: option.kind === "model" ? option.glyph : undefined,
        modelId: option.kind === "model" ? option.id : undefined,
      };

      const rebuilt: Segment[] = next.slice(0, mention.segmentIndex);
      if (before) rebuilt.push({ type: "text", value: before });
      rebuilt.push({ type: "token", token });
      rebuilt.push({ type: "text", value: " " });
      return rebuilt;
    });
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const handleSend = () => {
    const plain = segmentsToPlainText(normalizedSegments).trim();
    if ((!plain && tokens.length === 0) || disabled) return;
    onSend?.({ text: plain, tokens });
    setSegments([{ type: "text", value: "" }]);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape" && menuOpen) {
      const mention = findActiveMention(normalizedSegments);
      if (mention) {
        const seg = normalizedSegments[mention.segmentIndex];
        if (seg.type === "text") {
          updateDraft(seg.value.replace(/@([^\s@]*)$/, ""));
        }
      }
    }
  };

  // Position suggestion menu above @ caret
  useLayoutEffect(() => {
    if (!menuOpen || !mirrorRef.current || !caretProbeRef.current) {
      setMenuLeft(0);
      return;
    }
    const mirrorRect = mirrorRef.current.getBoundingClientRect();
    const probeRect = caretProbeRef.current.getBoundingClientRect();
    const left = Math.max(0, Math.min(probeRect.left - mirrorRect.left, mirrorRect.width - 280));
    setMenuLeft(left);
  }, [menuOpen, menuQuery, normalizedSegments, draftText]);

  useEffect(() => {
    if (expanded && inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.max(24, inputRef.current.scrollHeight)}px`;
    }
  }, [draftText, expanded, normalizedSegments]);

  return (
    <div className={`relative w-full ${className}`}>
      {menuOpen && (
        <SuggestionMenu
          query={menuQuery}
          onSelect={insertToken}
          style={{ left: menuLeft }}
        />
      )}

      <div
        className={`relative flex flex-col rounded-[24px] bg-[#18181C] transition-all duration-200 ${
          expanded ? "pb-2 pt-1" : ""
        } ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        <div
          className={`flex items-center gap-2 px-4 ${expanded ? "py-3" : "h-[52px]"}`}
          onClick={() => inputRef.current?.focus()}
        >
          <div className={`relative min-w-0 flex-1 ${!expanded ? "pr-2" : ""}`}>
            <div
              ref={mirrorRef}
              aria-hidden
              className={`pointer-events-none whitespace-pre-wrap break-words text-[15px] leading-6 text-[#d9d9d9] ${
                expanded ? "min-h-[24px]" : ""
              }`}
            >
              {normalizedSegments.map((seg, i) => {
                if (seg.type === "token") {
                  return <InlineTokenBadge key={`${seg.token.id}-${i}`} token={seg.token} />;
                }
                const isLast = i === normalizedSegments.length - 1;
                const isMentionSeg = activeMention?.segmentIndex === i;
                if (isLast && isMentionSeg) {
                  const before = seg.value.replace(/@([^\s@]*)$/, "");
                  const mentionPart = seg.value.slice(before.length);
                  return (
                    <span key={i}>
                      {before}
                      <span ref={caretProbeRef}>{renderHighlightedText(mentionPart)}</span>
                    </span>
                  );
                }
                if (isLast) {
                  return <span key={i}>{renderHighlightedText(seg.value)}</span>;
                }
                return <span key={i}>{seg.value}</span>;
              })}
              {!hasContent && !focused && (
                <span className="text-[#d9d9d9]/50">
                  Message team, or type @ to summon AI...
                </span>
              )}
            </div>

            <textarea
              ref={inputRef}
              value={draftText}
              onChange={(e) => updateDraft(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 150)}
              onKeyDown={handleKeyDown}
              rows={1}
              className={`absolute inset-0 w-full resize-none bg-transparent text-[15px] leading-6 text-transparent caret-[#d9d9d9] focus:outline-none ${
                expanded ? "min-h-[24px]" : ""
              }`}
              style={{ WebkitTextFillColor: "transparent" }}
            />
          </div>

          {!expanded && (
            <IconCircleButton label="Голосовой ввод" className="bg-transparent hover:bg-[#3a3a3a]">
              <MicrophoneIcon />
            </IconCircleButton>
          )}
        </div>

        {expanded ? (
          <div className="flex items-center justify-between px-2 pb-1">
            <IconCircleButton label="Добавить">
              <span className="text-xl leading-none">+</span>
            </IconCircleButton>

            {activeModel ? (
              <button
                type="button"
                onClick={handleSend}
                className="flex items-center gap-2 rounded-full py-1 pl-3 pr-1 transition-all duration-200 hover:bg-[#ffbc50]/10"
              >
                <span className="whitespace-nowrap text-[15px] leading-5 text-[#d9d9d9]/70">
                  Ask {activeModel.label}
                </span>
                <span className="flex size-10 items-center justify-center rounded-full bg-[#ffbc50] text-sm font-semibold text-[#191919]">
                  {activeModel.glyph ?? "✦"}
                </span>
              </button>
            ) : hasMemberToken || hasContent ? (
              <button
                type="button"
                onClick={handleSend}
                className="group flex items-center gap-2 rounded-full py-1 pl-2 pr-1 transition-all duration-200 hover:bg-white/[0.04]"
              >
                <span className="whitespace-nowrap text-[15px] leading-5 text-[#d9d9d9]/70 transition-all duration-200 group-hover:text-[#d9d9d9]">
                  Send to All
                </span>
                <span className="flex size-10 items-center justify-center rounded-full bg-[#ffbc50] transition-all duration-200 group-hover:bg-[#ffc966]">
                  <SendIcon className="text-[#191919]" />
                </span>
              </button>
            ) : (
              <IconCircleButton label="Голосовой ввод">
                <MicrophoneIcon />
              </IconCircleButton>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
