import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from "react";
import { fetchModelResponse } from "../api/chat";

// ─── Типы ───────────────────────────────────────────────────────────────────

type Role = "user" | "assistant";

interface Message {
  id: string;
  role: Role;
  paragraphs: string[];
  model?: ModelId;
  branchCount?: number;
}

interface DialogItem {
  id: string;
  title: string;
  messageCount: number;
  branchCount: number;
}

type ModelId = "gemini" | "groq" | "gpt4o" | "claude35";

interface ModelMeta {
  id: ModelId;
  label: string;
  cost: number;
  color: string;
}

// ─── Константы (Figma Cyber) ─────────────────────────────────────────────────

const MODELS: ModelMeta[] = [
  { id: "gemini", label: "Gemini 3.5 Flash", cost: 2, color: "#4285f4" },
  { id: "groq", label: "Llama 3.3 · Groq", cost: 1, color: "#f55036" },
  { id: "gpt4o", label: "GPT-4o", cost: 2, color: "#10a37f" },
  { id: "claude35", label: "Claude 3.5", cost: 3, color: "#d97757" },
];

const TOKEN_BALANCE = 378;

const PAST_DIALOGS: DialogItem[] = [
  { id: "1", title: "Обеспечение отказоустойчивости БД", messageCount: 12, branchCount: 4 },
  { id: "2", title: "Оптимизация PostgreSQL", messageCount: 8, branchCount: 2 },
  { id: "3", title: "Миграция на Kubernetes", messageCount: 15, branchCount: 6 },
  { id: "4", title: "Архитектура микросервисов", messageCount: 6, branchCount: 1 },
];

const INITIAL_MAIN_MESSAGES: Message[] = [
  {
    id: "u1",
    role: "user",
    paragraphs: ["Как настроить отказоустойчивость PostgreSQL в продакшене?"],
  },
  {
    id: "a1",
    role: "assistant",
    model: "gpt4o",
    branchCount: 4,
    paragraphs: [
      "Для обеспечения отказоустойчивости PostgreSQL в продакшене рекомендуется использовать репликацию streaming replication в сочетании с автоматическим failover через Patroni или repmgr. Primary-узел принимает запись, а один или несколько standby-узлов получают WAL в режиме реального времени. Это позволяет быстро переключиться на реплику при падении мастера без потери данных.",
      "Критически важным компонентом является PgBouncer — лёгкий connection pooler, который снижает нагрузку на CPU, вызванную постоянным открытием и закрытием соединений. Настройте pool_mode в transaction для большинства веб-приложений и ограничьте max_client_conn в соответствии с max_connections на сервере PostgreSQL. Разместите PgBouncer на том же хосте, что и приложение, чтобы минимизировать задержку.",
      "Не забывайте про регулярное обслуживание: autovacuum должен быть включён и правильно настроен (autovacuum_vacuum_scale_factor, autovacuum_analyze_scale_factor). Мониторьте bloat через pg_stat_user_tables и используйте pg_repack для онлайн-перестройки индексов без простоя. Для RAM-интенсивных нагрузок выделите shared_buffers около 25% от доступной памяти и настройте effective_cache_size.",
    ],
  },
  {
    id: "u2",
    role: "user",
    paragraphs: ["Дальше"],
  },
];

const BRANCH_MESSAGES_BY_ANCHOR: Record<string, Message[]> = {
  pgbouncer: [
    { id: "b-u1", role: "user", paragraphs: ["Что насчёт PgBouncer?"] },
    {
      id: "b-a1",
      role: "assistant",
      model: "claude35",
      branchCount: 1,
      paragraphs: [
        "PgBouncer — это лёгкий connection pooler для PostgreSQL. В режиме transaction он возвращает соединение в пул сразу после COMMIT/ROLLBACK, что критично для веб-приложений с короткими транзакциями.",
        "Рекомендуемые настройки: pool_mode = transaction, default_pool_size = 20–50, max_client_conn = 1000, server_lifetime = 3600.",
      ],
    },
  ],
  replication: [
    { id: "b-u2", role: "user", paragraphs: ["Как проверить репликацию?"] },
    {
      id: "b-a2",
      role: "assistant",
      model: "gpt4o",
      paragraphs: [
        "На standby: SELECT pg_is_in_recovery(); → true. Сравните pg_current_wal_lsn() на primary и pg_last_wal_replay_lsn() на реплике — lag должен быть минимальным.",
      ],
    },
  ],
  autovacuum: [
    { id: "b-u3", role: "user", paragraphs: ["Какие параметры autovacuum менять?"] },
    {
      id: "b-a3",
      role: "assistant",
      model: "groq",
      paragraphs: [
        "autovacuum_max_workers по числу ядер, autovacuum_naptime = 30s, autovacuum_vacuum_scale_factor = 0.05 на крупных таблицах.",
      ],
    },
  ],
  ram: [
    { id: "b-u4", role: "user", paragraphs: ["Сколько RAM выделить под shared_buffers?"] },
    {
      id: "b-a4",
      role: "assistant",
      model: "gpt4o",
      paragraphs: [
        "Обычно 25% от доступной RAM сервера, но не более 8–16 GB. Остальное отдайте под OS cache через effective_cache_size ≈ 75% RAM.",
      ],
    },
  ],
};

function getBranchKey(anchor: string): string {
  const lower = anchor.toLowerCase();
  if (lower.includes("pgbouncer")) return "pgbouncer";
  if (lower.includes("репликац") || lower.includes("patroni")) return "replication";
  if (lower.includes("autovacuum") || lower.includes("vacuum")) return "autovacuum";
  if (lower.includes("ram")) return "ram";
  return "pgbouncer";
}

function getBranchMessages(anchor: string): Message[] {
  return BRANCH_MESSAGES_BY_ANCHOR[getBranchKey(anchor)] ?? BRANCH_MESSAGES_BY_ANCHOR.pgbouncer;
}

function getModel(id?: ModelId): ModelMeta {
  return MODELS.find((m) => m.id === id) ?? MODELS[0];
}

// ─── Иконки ──────────────────────────────────────────────────────────────────

function CoinIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="6" fill="#f5a623" fillOpacity="0.2" stroke="#f5a623" strokeWidth="1" />
      <text x="7" y="10" textAnchor="middle" fill="#f5a623" fontSize="7" fontWeight="bold">
        ₿
      </text>
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M2 5.5A1.5 1.5 0 013.5 4H7l1.5 1.5H14.5A1.5 1.5 0 0116 7v6.5A1.5 1.5 0 0114.5 15h-11A1.5 1.5 0 012 13.5V5.5z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BranchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="2.5" cy="7" r="1.5" fill="currentColor" />
      <circle cx="11.5" cy="3" r="1.5" fill="currentColor" />
      <circle cx="11.5" cy="11" r="1.5" fill="currentColor" />
      <path d="M4 6.3L9.8 3.8M4 7.7L9.8 10.2" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M3 10V3.5A1.5 1.5 0 014.5 2H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <path d="M7.5 9.5V3M7.5 3L5 5.5M7.5 3L10 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 11.5h9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="5.5" y="2" width="5" height="8" rx="2.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M3 8a5 5 0 0010 0M8 13v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
      <path
        d="M2 3.5h11a1 1 0 011 1v5.5a1 1 0 01-1 1H8l-2 2v-2H2a1 1 0 01-1-1V4.5a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function QuestionBadge({ onClick }: { onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className="ml-1 inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#f5a623]/20 text-[10px] font-bold text-[#f5a623] transition-all duration-300 hover:bg-[#f5a623]/35"
      aria-label="Уточнить"
    >
      ?
    </button>
  );
}

/** Логотип модели (упрощённый, как в Figma) */
function ModelAvatar({ model, size = 20 }: { model: ModelMeta; size?: number }) {
  const icons: Record<ModelId, string> = {
    gemini: "✧",
    groq: "⬡",
    gpt4o: "◯",
    claude35: "✦",
  };
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.45,
        backgroundColor: `${model.color}22`,
        color: model.color,
      }}
    >
      {icons[model.id]}
    </span>
  );
}

// ─── Общие UI-блоки ──────────────────────────────────────────────────────────

function TokenPill({ amount }: { amount: number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-[#2a2a2a] bg-[#1a1a1a] px-3 py-1.5">
      <CoinIcon size={13} />
      <span className="text-sm font-medium text-[#f5a623]">{amount}</span>
    </div>
  );
}

function StreamingToggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      aria-pressed={enabled}
      title={enabled ? "Стриминг включён" : "Ответ целиком после генерации"}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-300 ${
        enabled
          ? "border-[#f5a623]/40 bg-[#f5a623]/10 text-[#f5a623]"
          : "border-[#2a2a2a] bg-[#141414] text-[#6b6b6b] hover:border-[#3a3a3a] hover:text-[#9a9a9a]"
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
        {enabled ? (
          <>
            <path d="M1 4.5h1.5v5H1V4.5zM4 3h1.5v8H4V3zM7 5h1.5v4H7V5zM10 2h1.5v10H10V2z" fill="currentColor" />
          </>
        ) : (
          <path
            d="M2.5 3.5h9a1 1 0 011 1v5a1 1 0 01-1 1h-9a1 1 0 01-1-1v-5a1 1 0 011-1z"
            stroke="currentColor"
            strokeWidth="1.2"
          />
        )}
      </svg>
      <span>{enabled ? "Стриминг" : "Целиком"}</span>
    </button>
  );
}

function ModelCostChip({
  model,
  selected,
  onClick,
}: {
  model: ModelMeta;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 flex-col items-center gap-1 rounded-xl p-2 transition-all duration-300 ${
        selected
          ? "bg-[#2a2a2a] ring-1 ring-[#f5a623]/40"
          : "hover:bg-[#1a1a1a]"
      }`}
    >
      <ModelAvatar model={model} size={32} />
      <span className="flex items-center gap-0.5 text-[10px] text-[#6b6b6b]">
        <CoinIcon size={10} />
        {model.cost}
      </span>
    </button>
  );
}

// ─── Хедер (фиксированный) ───────────────────────────────────────────────────

interface HeaderProps {
  selectedModel: ModelId;
  onModelChange: (model: ModelId) => void;
  streamingEnabled: boolean;
  onStreamingChange: (enabled: boolean) => void;
}

function Header({ selectedModel, onModelChange, streamingEnabled, onStreamingChange }: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const current = getModel(selectedModel);

  return (
    <header className="fixed top-0 right-0 left-0 z-50 flex h-[52px] items-center border-b border-[#1f1f1f] bg-[#0a0a0a]/95 px-4 backdrop-blur-md">
      {/* Логотип Cyber */}
      <div className="flex w-[15%] min-w-[160px] items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1a1a1a]">
          <span className="text-sm font-bold text-[#f5a623]">C</span>
        </div>
        <span className="text-sm font-semibold tracking-tight text-white">Cyber</span>
      </div>

      {/* Селектор моделей — pill по центру */}
      <div className="relative flex flex-1 justify-center">
        <button
          type="button"
          onClick={() => setDropdownOpen((v) => !v)}
          className="flex items-center gap-2 rounded-full border border-[#2a2a2a] bg-[#141414] px-4 py-2 text-sm text-white transition-all duration-300 hover:border-[#3a3a3a]"
        >
          <ModelAvatar model={current} size={18} />
          <span>{current.label}</span>
          <span className="text-[#6b6b6b]">▾</span>
        </button>

        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
            <div className="absolute top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#141414] shadow-2xl">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    onModelChange(m.id);
                    setDropdownOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-[#1a1a1a] ${
                    m.id === selectedModel ? "text-white" : "text-[#9a9a9a]"
                  }`}
                >
                  <ModelAvatar model={m} size={22} />
                  <span className="flex-1">{m.label}</span>
                  <span className="flex items-center gap-0.5 text-xs text-[#6b6b6b]">
                    <CoinIcon size={10} />
                    {m.cost}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Токены + стриминг + профиль */}
      <div className="flex w-[15%] min-w-[220px] items-center justify-end gap-2">
        <StreamingToggle enabled={streamingEnabled} onChange={onStreamingChange} />
        <TokenPill amount={TOKEN_BALANCE} />
        <button
          type="button"
          aria-label="Профиль"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#2a2a2a] bg-[#141414] text-[#6b6b6b] transition-all duration-300 hover:text-white"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </header>
  );
}

// ─── Сайдбар ─────────────────────────────────────────────────────────────────

interface SidebarProps {
  activeDialogId: string;
  onSelectDialog: (id: string) => void;
  onNewChat: () => void;
}

function Sidebar({ activeDialogId, onSelectDialog, onNewChat }: SidebarProps) {
  return (
    <aside className="flex h-full w-[15%] min-w-[200px] flex-col border-r border-[#1f1f1f] bg-[#0a0a0a]">
      <div className="flex items-center gap-2 border-b border-[#1f1f1f] p-3">
        <button
          type="button"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#141414] text-[#9a9a9a] transition-all duration-300 hover:text-white"
          aria-label="Папки"
        >
          <FolderIcon />
        </button>
        <button
          type="button"
          onClick={onNewChat}
          className="flex-1 rounded-xl bg-[#141414] px-3 py-2 text-sm font-medium text-white transition-all duration-300 hover:bg-[#1a1a1a]"
        >
          + Новый чат
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-widest text-[#4a4a4a]">
          История
        </p>
        <ul className="space-y-0.5">
          {PAST_DIALOGS.map((dialog) => {
            const isActive = dialog.id === activeDialogId;
            return (
              <li key={dialog.id}>
                <button
                  type="button"
                  onClick={() => onSelectDialog(dialog.id)}
                  className={`flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-all duration-300 ${
                    isActive ? "bg-[#1a1a1a] text-white" : "text-[#6b6b6b] hover:bg-[#141414] hover:text-[#9a9a9a]"
                  }`}
                >
                  <span className="mt-0.5 shrink-0">
                    <ChatIcon />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] leading-snug">{dialog.title}</span>
                    <span className="mt-1 flex items-center gap-2 text-[11px] text-[#4a4a4a]">
                      <span>💬 {dialog.messageCount}</span>
                      <span>/</span>
                      <span className="flex items-center gap-0.5">
                        <BranchIcon />
                        {dialog.branchCount}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

// ─── Чат-тулбар (как в Figma — пилюля с названием) ───────────────────────────

function ChatToolbar({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-[#1f1f1f] px-5 py-3">
      <button
        type="button"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#141414] text-[#6b6b6b] lg:hidden"
        aria-label="Папки"
      >
        <FolderIcon />
      </button>
      <div className="flex flex-1 justify-center">
        <div className="w-full max-w-md truncate rounded-full border border-[#2a2a2a] bg-[#141414] px-5 py-2 text-center text-sm text-[#9a9a9a]">
          {title}
        </div>
      </div>
    </div>
  );
}

// ─── Абзац с hover и якорями ─────────────────────────────────────────────────

const HIGHLIGHT_TERMS = ["PgBouncer", "autovacuum", "Patroni", "RAM", "PostgreSQL"];

interface ParagraphBlockProps {
  text: string;
  paragraphIndex: number;
  isActive: boolean;
  interactive: boolean;
  onClarify: (text: string) => void;
}

function ParagraphBlock({
  text,
  paragraphIndex,
  isActive,
  interactive,
  onClarify,
}: ParagraphBlockProps) {
  const [hovered, setHovered] = useState(false);

  if (!interactive) {
    return (
      <p className="text-[15px] leading-relaxed text-[#d4d4d4]">
        {renderHighlightedText(text, () => {})}
      </p>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onClarify(text)}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClarify(text);
        }
      }}
      className={`group relative -mx-3 flex cursor-pointer items-start gap-2 rounded-xl px-3 py-2.5 transition-all duration-300 ${
        isActive
          ? "bg-[#f5a623]/8 ring-1 ring-[#f5a623]/25"
          : hovered
            ? "bg-[#1a1a1a]/80"
            : ""
      }`}
      aria-label={`Уточнить абзац ${paragraphIndex + 1}`}
    >
      <p className="flex-1 text-[15px] leading-relaxed text-[#d4d4d4]">
        {renderHighlightedText(text, () => onClarify(text))}
      </p>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClarify(text);
        }}
        className={`shrink-0 rounded-lg border border-[#2a2a2a] bg-[#141414] px-2 py-1 text-[11px] font-medium text-[#f5a623] transition-all duration-300 hover:border-[#f5a623]/40 ${
          hovered || isActive ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        [+] Уточнить
      </button>
    </div>
  );
}

function renderHighlightedText(text: string, onTermClick: () => void) {
  const pattern = new RegExp(`(${HIGHLIGHT_TERMS.join("|")})`, "gi");
  const parts = text.split(pattern);

  return parts.map((part, i) => {
    const isTerm = HIGHLIGHT_TERMS.some((t) => t.toLowerCase() === part.toLowerCase());
    if (isTerm) {
      return (
        <span key={i} className="inline-flex items-center">
          <span className="font-medium text-[#f5a623]">{part}</span>
          <QuestionBadge onClick={onTermClick} />
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ─── Сообщение ───────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: Message;
  activeContextAnchor: string | null;
  interactive?: boolean;
  onClarify: (text: string) => void;
}

function MessageBubble({
  message,
  activeContextAnchor,
  interactive = true,
  onClarify,
}: MessageBubbleProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-[#1a1a1a] px-4 py-2.5 text-[15px] leading-relaxed text-white">
          {message.paragraphs[0]}
        </div>
      </div>
    );
  }

  const model = getModel(message.model);

  return (
    <div>
      <div className="space-y-3">
        {message.paragraphs.map((para, idx) => (
          <ParagraphBlock
            key={`${message.id}-p${idx}`}
            text={para}
            paragraphIndex={idx}
            isActive={activeContextAnchor === para}
            interactive={interactive}
            onClarify={onClarify}
          />
        ))}
      </div>

      {/* Футер сообщения — как в Figma */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[#4a4a4a]">
          <ModelAvatar model={model} size={18} />
          <span className="text-[#2a2a2a]">·</span>
          <span className="flex items-center gap-1 text-xs">
            <BranchIcon />
            <span>{message.branchCount ?? 0}</span>
          </span>
        </div>
        <div className="flex items-center gap-3 text-[#4a4a4a]">
          <button type="button" className="transition-colors duration-300 hover:text-[#9a9a9a]" aria-label="Копировать">
            <CopyIcon />
          </button>
          <button type="button" className="transition-colors duration-300 hover:text-[#9a9a9a]" aria-label="Поделиться">
            <ShareIcon />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Поле ввода (Figma: модель слева + pill input) ───────────────────────────

interface ChatInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  selectedModel: ModelId;
  onModelChange?: (model: ModelId) => void;
  showModelPicker?: boolean;
  disabled?: boolean;
}

function ChatInput({
  placeholder = "Ask anything",
  value,
  onChange,
  onSubmit,
  selectedModel,
  onModelChange,
  showModelPicker = true,
  disabled = false,
}: ChatInputProps) {
  const model = getModel(selectedModel);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim() && !disabled) onSubmit();
  };

  return (
    <div className="border-t border-[#1f1f1f] bg-[#0a0a0a] px-4 py-4">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        {/* Чип модели с ценой */}
        {showModelPicker && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              const idx = MODELS.findIndex((m) => m.id === selectedModel);
              onModelChange?.(MODELS[(idx + 1) % MODELS.length].id);
            }}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#2a2a2a] bg-[#141414] px-2.5 py-2 transition-all duration-300 hover:border-[#3a3a3a] disabled:opacity-50"
            title="Сменить модель"
          >
            <ModelAvatar model={model} size={22} />
            <span className="flex items-center gap-0.5 text-xs text-[#f5a623]">
              <CoinIcon size={11} />
              {model.cost}
            </span>
          </button>
        )}

        {/* Pill input */}
        <div className="flex flex-1 items-center gap-2 rounded-2xl border border-[#2a2a2a] bg-[#141414] px-4 py-3 transition-all duration-300 focus-within:border-[#3a3a3a]">
          <button type="button" className="text-[#4a4a4a] transition-colors hover:text-[#9a9a9a]" aria-label="Вложения">
            +
          </button>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={disabled ? "Генерация ответа…" : placeholder}
            disabled={disabled}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-[#4a4a4a] focus:outline-none disabled:opacity-50"
          />
          <button type="button" className="text-[#4a4a4a] transition-colors hover:text-[#9a9a9a]" aria-label="Голосовой ввод">
            <MicIcon />
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Панель ветки (правая колонка) ───────────────────────────────────────────

interface BranchPanelProps {
  activeContextAnchor: string;
  breadcrumb: string;
  messages: Message[];
  inputValue: string;
  branchModel: ModelId;
  onBranchModelChange: (model: ModelId) => void;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  isLoading?: boolean;
}

function BranchPanel({
  activeContextAnchor,
  breadcrumb,
  messages,
  inputValue,
  branchModel,
  onBranchModelChange,
  onInputChange,
  onSubmit,
  onClose,
  isLoading = false,
}: BranchPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  return (
    <aside className="flex h-full w-full flex-col bg-[#0d0d0d]">
      {/* Шапка */}
      <div className="flex items-center justify-between border-b border-[#1f1f1f] px-4 py-3">
        <span className="text-xs font-medium uppercase tracking-widest text-[#4a4a4a]">
          Ветка уточнения
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6b6b6b] transition-all duration-300 hover:bg-[#1a1a1a] hover:text-white"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Breadcrumb — как в Figma «Стриминг... > RAM» */}
      <div className="mx-4 mt-3">
        <div className="rounded-full border border-[#2a2a2a] bg-[#141414] px-4 py-2 text-xs text-[#6b6b6b]">
          {breadcrumb}
        </div>
      </div>

      {/* Якорь контекста — тёмная пилюля */}
      <div className="mx-4 mt-2">
        <div className="rounded-2xl border border-[#2a2a2a] bg-[#141414] px-4 py-3">
          <p className="line-clamp-2 text-[13px] leading-relaxed text-[#9a9a9a]">
            {activeContextAnchor}
          </p>
        </div>
      </div>

      <p className="px-4 py-3 text-xs leading-relaxed text-[#4a4a4a]">
        Глубокий анализ под-контекста. Задайте вопрос выбранной модели.
      </p>

      {/* Горизонтальный выбор моделей с ценой */}
      <div className="flex gap-1 overflow-x-auto px-4 pb-3">
        {MODELS.map((m) => (
          <ModelCostChip
            key={m.id}
            model={m}
            selected={m.id === branchModel}
            onClick={() => onBranchModelChange(m.id)}
          />
        ))}
      </div>

      {/* Мини-чат */}
      <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto px-4 pb-4">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            activeContextAnchor={null}
            interactive={false}
            onClarify={() => {}}
          />
        ))}
      </div>

      <ChatInput
        placeholder="Ask anything"
        value={inputValue}
        onChange={onInputChange}
        onSubmit={onSubmit}
        selectedModel={branchModel}
        onModelChange={onBranchModelChange}
        showModelPicker
        disabled={isLoading}
      />
    </aside>
  );
}

// ─── Главный компонент ───────────────────────────────────────────────────────

export default function AggregatorChat() {
  const [selectedModel, setSelectedModel] = useState<ModelId>("gemini");
  const [branchModel, setBranchModel] = useState<ModelId>("gemini");
  const [activeDialogId, setActiveDialogId] = useState("1");

  const [isBranchOpen, setIsBranchOpen] = useState(false);
  const [activeContextAnchor, setActiveContextAnchor] = useState<string | null>(null);
  const [branchBreadcrumb, setBranchBreadcrumb] = useState("");

  const [mainMessages, setMainMessages] = useState<Message[]>(INITIAL_MAIN_MESSAGES);
  const [branchMessages, setBranchMessages] = useState<Message[]>([]);

  const [mainInput, setMainInput] = useState("");
  const [branchInput, setBranchInput] = useState("");
  const [isMainLoading, setIsMainLoading] = useState(false);
  const [isBranchLoading, setIsBranchLoading] = useState(false);
  const [streamingEnabled, setStreamingEnabled] = useState(true);

  const mainScrollRef = useRef<HTMLDivElement>(null);

  const activeDialog = PAST_DIALOGS.find((d) => d.id === activeDialogId);
  const chatTitle = activeDialog?.title ?? "Новый чат";

  useEffect(() => {
    mainScrollRef.current?.scrollTo({ top: mainScrollRef.current.scrollHeight, behavior: "smooth" });
  }, [mainMessages]);

  const handleClarify = (paragraphText: string) => {
    const key = getBranchKey(paragraphText);
    const label = key === "pgbouncer" ? "PgBouncer" : key === "ram" ? "RAM" : key === "replication" ? "Репликация" : "Autovacuum";

    setActiveContextAnchor(paragraphText);
    setBranchBreadcrumb(`${chatTitle.slice(0, 12)}… › ${label}`);
    setBranchMessages(getBranchMessages(paragraphText));
    setIsBranchOpen(true);
  };

  const handleCloseBranch = () => {
    setIsBranchOpen(false);
    setActiveContextAnchor(null);
    setBranchInput("");
  };

  const handleMainSubmit = async () => {
    const text = mainInput.trim();
    if (!text || isMainLoading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      paragraphs: [text],
    };

    const assistantId = `a-${Date.now()}`;

    setMainMessages((prev) => [
      ...prev,
      userMsg,
      {
        id: assistantId,
        role: "assistant",
        model: selectedModel,
        branchCount: 0,
        paragraphs: ["…"],
      },
    ]);
    setMainInput("");
    setIsMainLoading(true);

    try {
      const paragraphs = await fetchModelResponse(
        selectedModel,
        text,
        streamingEnabled,
        streamingEnabled
          ? (streamedParagraphs) => {
              setMainMessages((prev) =>
                prev.map((message) =>
                  message.id === assistantId ? { ...message, paragraphs: streamedParagraphs } : message,
                ),
              );
            }
          : undefined,
      );
      setMainMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId ? { ...message, paragraphs } : message,
        ),
      );
    } catch {
      setMainMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                paragraphs: [
                  "Не удалось получить ответ от сервера.",
                  "Убедитесь, что backend запущен: uvicorn backend.main:app --reload",
                ],
              }
            : message,
        ),
      );
    } finally {
      setIsMainLoading(false);
    }
  };

  const handleBranchSubmit = async () => {
    const text = branchInput.trim();
    if (!text || isBranchLoading) return;

    const userMsg: Message = {
      id: `b-u-${Date.now()}`,
      role: "user",
      paragraphs: [text],
    };

    const assistantId = `b-a-${Date.now()}`;

    setBranchMessages((prev) => [
      ...prev,
      userMsg,
      {
        id: assistantId,
        role: "assistant",
        model: branchModel,
        branchCount: 0,
        paragraphs: ["…"],
      },
    ]);
    setBranchInput("");
    setIsBranchLoading(true);

    const prompt = activeContextAnchor
      ? `Контекст:\n${activeContextAnchor}\n\nВопрос:\n${text}`
      : text;

    try {
      const paragraphs = await fetchModelResponse(
        branchModel,
        prompt,
        streamingEnabled,
        streamingEnabled
          ? (streamedParagraphs) => {
              setBranchMessages((prev) =>
                prev.map((message) =>
                  message.id === assistantId ? { ...message, paragraphs: streamedParagraphs } : message,
                ),
              );
            }
          : undefined,
      );
      setBranchMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId ? { ...message, paragraphs } : message,
        ),
      );
    } catch {
      setBranchMessages((prev) =>
        prev.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                paragraphs: ["Ошибка при запросе к серверу. Проверьте, что backend доступен."],
              }
            : message,
        ),
      );
    } finally {
      setIsBranchLoading(false);
    }
  };

  const handleNewChat = () => {
    setMainMessages([]);
    setMainInput("");
    handleCloseBranch();
    setActiveDialogId("new");
  };

  const mainChatWidth = isBranchOpen ? "w-[50%]" : "w-[85%]";

  return (
    <div className="flex h-full flex-col bg-[#0a0a0a] text-white">
      <Header
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        streamingEnabled={streamingEnabled}
        onStreamingChange={setStreamingEnabled}
      />

      <div className="flex flex-1 overflow-hidden pt-[52px]">
        <Sidebar
          activeDialogId={activeDialogId}
          onSelectDialog={setActiveDialogId}
          onNewChat={handleNewChat}
        />

        {/* Центральная колонка */}
        <main className={`flex ${mainChatWidth} min-w-0 flex-col transition-all duration-300`}>
          <ChatToolbar title={chatTitle} />

          <div ref={mainScrollRef} className="flex-1 space-y-8 overflow-y-auto px-6 py-6">
            {mainMessages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-[#4a4a4a]">
                <p className="text-center text-sm leading-relaxed">
                  Начните новый диалог или выберите чат из истории
                </p>
              </div>
            ) : (
              <>
                {mainMessages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    activeContextAnchor={activeContextAnchor}
                    onClarify={handleClarify}
                  />
                ))}
                {isMainLoading && (
                  <div className="flex items-center gap-2 text-sm text-[#6b6b6b]">
                    <ModelAvatar model={getModel(selectedModel)} size={18} />
                    <span>Генерация ответа…</span>
                  </div>
                )}
              </>
            )}
          </div>

          <ChatInput
            value={mainInput}
            onChange={setMainInput}
            onSubmit={handleMainSubmit}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            disabled={isMainLoading}
          />
        </main>

        {/* Правая колонка — ветка */}
        <div
          className={`overflow-hidden border-l border-[#1f1f1f] transition-all duration-300 ${
            isBranchOpen ? "w-[35%] opacity-100" : "w-0 opacity-0"
          }`}
        >
          {isBranchOpen && activeContextAnchor && (
            <BranchPanel
              activeContextAnchor={activeContextAnchor}
              breadcrumb={branchBreadcrumb}
              messages={branchMessages}
              inputValue={branchInput}
              branchModel={branchModel}
              onBranchModelChange={setBranchModel}
              onInputChange={setBranchInput}
              onSubmit={handleBranchSubmit}
              onClose={handleCloseBranch}
              isLoading={isBranchLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
