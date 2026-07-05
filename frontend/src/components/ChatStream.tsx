import { useState, type ReactNode } from "react";
import BranchButton from "./cyber/BranchButton";

// ─── Types ───────────────────────────────────────────────────────────────────

type ParticipantType = "user" | "model";

export interface Participant {
  id: string;
  name: string;
  type: ParticipantType;
  color: string;
  initials: string;
}

interface TextToken {
  kind: "text";
  value: string;
}

interface UserMentionToken {
  kind: "user-mention";
  name: string;
}

interface AiMentionToken {
  kind: "ai-mention";
  name: string;
}

type MessageToken = TextToken | UserMentionToken | AiMentionToken;

interface ParagraphBlock {
  id: string;
  text: string;
  threadParticipants?: Participant[];
}

interface UserChatMessage {
  id: string;
  kind: "user";
  isSelf: boolean;
  author: Participant;
  tokens: MessageToken[];
}

interface AiChatMessage {
  id: string;
  kind: "ai";
  paragraphs: ParagraphBlock[];
  globalThreadParticipants?: Participant[];
  isStreaming?: boolean;
  modelName?: string;
}

type ChatMessage = UserChatMessage | AiChatMessage;

export interface ChatStreamProps {
  messages?: ChatMessage[];
  onThreadOpen?: (paragraphId: string) => void;
  className?: string;
}

export { MOCK_MESSAGES };
export type { ChatMessage, UserChatMessage, AiChatMessage };

// ─── Participants ────────────────────────────────────────────────────────────

const ELENA: Participant = {
  id: "elena",
  name: "Елена",
  type: "user",
  color: "#6366f1",
  initials: "Е",
};

const CLAUDE: Participant = {
  id: "claude",
  name: "Claude 3.5 Sonnet",
  type: "model",
  color: "#d97757",
  initials: "C",
};

const DMITRY: Participant = {
  id: "dmitry",
  name: "Дмитрий",
  type: "user",
  color: "#059669",
  initials: "Д",
};

const VIKTOR: Participant = {
  id: "viktor",
  name: "Виктор",
  type: "user",
  color: "#7c3aed",
  initials: "В",
};

const REGULATOR: Participant = {
  id: "regulator",
  name: "Аналитик",
  type: "user",
  color: "#0891b2",
  initials: "А",
};

// ─── Mock stream (Figma «Чат» frame) ─────────────────────────────────────────

const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: "u-self-1",
    kind: "user",
    isSelf: true,
    author: DMITRY,
    tokens: [
      {
        kind: "text",
        value:
          "Коллеги, нам нужно спроектировать отказоустойчивый кластер PostgreSQL для нашей финтех-платформы. Нагрузка на чтение будет колоссальной — до 15 000 RPS в пики. Запись — около 2 000 RPS. Какую базовую архитектуру выберем, чтобы не легла база, и как распределим нагрузку?",
      },
    ],
  },
  {
    id: "a-1",
    kind: "ai",
    paragraphs: [
      {
        id: "a-1-p-1",
        text: "Для обеспечения отказоустойчивости финтех-платформы мы разворачиваем кластер PostgreSQL по схеме Master-Slave с одной ведущей базой на запись и двумя синхронными репликами для распределения нагрузки на чтение.",
      },
      {
        id: "a-1-p-2",
        text: "Связующим звеном выступает асинхронная стриминговая репликация, работающая на уровне отправки WAL-файлов (Write-Ahead Logs). Для предотвращения расхождения реплик при пиковых нагрузках мы активируем постоянные слоты репликации.",
        threadParticipants: [ELENA, CLAUDE, DMITRY, VIKTOR],
      },
      {
        id: "a-1-p-3",
        text: "В качестве регламентного обслуживания настраивается агрессивный автовакуум (Autovacuum), чтобы предотвратить раздувание индексов (index bloat) в таблицах транзакций, где происходит до 10 000 операций обновления строк в минуту.",
      },
    ],
  },
  {
    id: "u-other-1",
    kind: "user",
    isSelf: false,
    author: ELENA,
    tokens: [
      {
        kind: "text",
        value:
          "Схемка рабочая, но две синхронные реплики на чтение — это оверхед по задержкам на запись (latency). Master будет ждать подтверждения от обоих Slave-серверов перед фиксацией транзакции. Если один Slave моргнет по сети, у нас встанет вся запись на платформе.",
      },
    ],
  },
  {
    id: "u-self-2",
    kind: "user",
    isSelf: true,
    author: DMITRY,
    tokens: [
      {
        kind: "text",
        value:
          "Хм, Дима прав. Если сеть между дата-центрами просядет, транзакции пользователей зависнут. Деньги со счетов будут списываться с задержкой в 5–10 секунд, это катастрофа для финтеха.",
      },
    ],
  },
  {
    id: "u-other-2",
    kind: "user",
    isSelf: false,
    author: REGULATOR,
    tokens: [
      {
        kind: "text",
        value:
          "Плюс учтите требования регулятора (ЦБ). Логи транзакций должны дублироваться мгновенно, но интерфейс приложения не должен виснуть для клиента.",
      },
    ],
  },
  {
    id: "u-other-3",
    kind: "user",
    isSelf: false,
    author: VIKTOR,
    tokens: [
      {
        kind: "text",
        value: "Нам нужен компромисс между скоростью и гарантией доставки данных.",
      },
    ],
  },
  {
    id: "u-other-4",
    kind: "user",
    isSelf: false,
    author: ELENA,
    tokens: [
      { kind: "ai-mention", name: "Claude-3.5-Sonnet" },
      {
        kind: "text",
        value:
          " Подключись к обсуждению. Проанализируй критику выше. Как нам изменить конфигурацию синхронности реплик в PostgreSQL, чтобы падение одного Slave-сервера не блокировало транзакции на запись на Master, но при этом сохранялась высокая отказоустойчивость?",
      },
    ],
  },
  {
    id: "a-2",
    kind: "ai",
    paragraphs: [
      {
        id: "a-2-p-1",
        text: "Оптимальным решением для финтех-сценария является использование параметра synchronous_commit = on в сочетании с директивой synchronous_standby_names = 'FIRST 1 (slave_1, slave_2)'.",
      },
      {
        id: "a-2-p-2",
        text: "Такая конфигурация означает «квази-синхронность»: Master будет требовать подтверждения записи только от одного любого исправного Slave-сервера из списка. Если slave_1 падает или отключается по сети, кластер мгновенно и бесшовно переключается на ожидание от slave_2, полностью исключая простои записи.",
      },
      {
        id: "a-2-p-3",
        text: "Для балансировки 15 000 RPS на чтение между этими репликами необходимо внедрить пул-коннектор PgBouncer на уровне каждого клиента приложений, настроенный строго в режиме сессий (pool_mode = session) для сохранения стабильных серверных стейтов.",
      },
    ],
    globalThreadParticipants: [ELENA, CLAUDE, DMITRY, VIKTOR],
  },
];

// ─── Primitives ────────────────────────────────────────────────────────────────

function Avatar({
  participant,
  size = 32,
}: {
  participant: Participant;
  size?: number;
}) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full font-medium text-white ring-2 ring-cyber-shell"
      style={{ width: size, height: size, backgroundColor: participant.color, fontSize: size * 0.35 }}
      title={participant.name}
    >
      {participant.type === "model" ? "✦" : participant.initials}
    </div>
  );
}

function AvatarStack({
  participants,
  onClick,
}: {
  participants: Participant[];
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[41px] w-full cursor-pointer items-center rounded-[56px] p-1.5 transition-all duration-200 hover:bg-white/[0.03]"
      aria-label="Открыть ветку обсуждения"
    >
      <div className="flex items-center">
        {participants.map((p, i) => (
          <div key={p.id} className={i > 0 ? "-ml-0.5" : ""} style={{ zIndex: participants.length - i }}>
            <Avatar participant={p} size={24} />
          </div>
        ))}
      </div>
    </button>
  );
}

function renderAiText(text: string): ReactNode[] {
  const parts = text.split(/(\b[\w.]+\s*=\s*(?:'[^']*'|\S+))/g);
  return parts.map((part, i) => {
    if (/^\b[\w.]+\s*=/.test(part)) {
      return (
        <code key={i} className="font-mono text-[14px] text-[#d9d9d9]">
          {part}
        </code>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function AiMentionBadge({ name }: { name: string }) {
  return (
    <span className="mx-0.5 inline-flex items-center gap-1 rounded-full bg-[#252525] py-0.5 pl-1 pr-2 text-[15px] leading-5">
      <span className="flex size-5 items-center justify-center rounded-full bg-[#ffbc50]/20 text-[10px] text-[#ffbc50]">
        ✦
      </span>
      <span className="text-[#ffbc50]">{name}</span>
    </span>
  );
}

function UserMentionBadge({ name }: { name: string }) {
  return (
    <span className="mx-0.5 inline-flex items-center gap-1 rounded-full bg-[#252525] py-0.5 pl-1 pr-2 text-[15px] leading-5">
      <span className="flex size-5 items-center justify-center rounded-full bg-[#6366f1] text-[9px] text-white">
        {name[0]}
      </span>
      <span className="text-[#ffbc50]">{name}</span>
    </span>
  );
}

function renderTokens(tokens: MessageToken[]): ReactNode[] {
  return tokens.map((token, i) => {
    if (token.kind === "text") return <span key={i}>{token.value}</span>;
    if (token.kind === "ai-mention") return <AiMentionBadge key={i} name={token.name} />;
    return <UserMentionBadge key={i} name={token.name} />;
  });
}

function ParagraphDivider() {
  return (
    <div className="py-2">
      <div className="h-px w-full bg-[#d9d9d9]/5" />
    </div>
  );
}

function GlobalThreadFooter({
  hasThread,
  participants,
  onOpen,
}: {
  hasThread: boolean;
  participants?: Participant[];
  onOpen: () => void;
}) {
  if (hasThread && participants) {
    return (
      <div className="pt-2">
        <AvatarStack participants={participants} onClick={onOpen} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onOpen();
        }}
        className="group flex h-[41px] w-full cursor-pointer items-center gap-4 rounded-[56px] p-1.5 transition-all duration-200 hover:bg-white/[0.03]"
        aria-label="Создать общую ветку"
      >
        <span className="size-1.5 shrink-0 rounded-full bg-[#d9d9d9]/40" />
        <BranchButton aria-label="Создать общую ветку" />
      </div>
      <ParagraphDivider />
    </div>
  );
}

function AiParagraph({
  paragraph,
  onThreadOpen,
  isFirst = false,
  isStreaming = false,
}: {
  paragraph: ParagraphBlock;
  onThreadOpen?: (id: string) => void;
  isFirst?: boolean;
  isStreaming?: boolean;
}) {
  const hasThread = Boolean(paragraph.threadParticipants?.length);

  return (
    <div className={isFirst ? "pt-0" : "pt-4"}>
      <div
        className={`group/para flex items-start gap-2 transition-all duration-200 ${
          hasThread || isStreaming ? "" : "rounded-md hover:bg-slate-800/40"
        }`}
      >
        {!hasThread && !isStreaming && (
          <div className="flex shrink-0 items-center gap-2 pr-2 opacity-0 transition-all duration-200 group-hover/para:opacity-100">
            <BranchButton onClick={() => onThreadOpen?.(paragraph.id)} />
            <span className="h-6 w-px rounded bg-white/40" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="break-words text-[15px] leading-5 text-[#d9d9d9]">
            {renderAiText(paragraph.text)}
            {isStreaming && (
              <span className="ml-0.5 inline-block h-4 w-px animate-pulse bg-[#ffbc50] align-middle" />
            )}
          </p>
          {hasThread && paragraph.threadParticipants && (
            <div className="mt-4">
              <AvatarStack
                participants={paragraph.threadParticipants}
                onClick={() => onThreadOpen?.(paragraph.id)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UserBubble({ message }: { message: UserChatMessage }) {
  const isSelf = message.isSelf;

  return (
    <div className={`flex ${isSelf ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[88%] items-end gap-3 ${isSelf ? "flex-row-reverse" : "flex-row"}`}>
        <Avatar participant={message.author} />
        <div
          className={`px-3 py-2 text-[15px] leading-5 text-[#d9d9d9] ${
            isSelf
              ? "rounded-bl-2xl rounded-br rounded-t-2xl bg-[#18181C]"
              : "rounded-bl rounded-br-2xl rounded-t-2xl bg-[#18181C]/80"
          }`}
        >
          {renderTokens(message.tokens)}
        </div>
      </div>
    </div>
  );
}

function AiResponse({
  message,
  onThreadOpen,
}: {
  message: AiChatMessage;
  onThreadOpen?: (id: string) => void;
}) {
  const globalId = `${message.id}-global`;
  const hasGlobalThread = Boolean(message.globalThreadParticipants?.length);

  return (
    <article>
      {message.paragraphs.map((p, i) => (
        <AiParagraph
          key={p.id}
          paragraph={p}
          onThreadOpen={onThreadOpen}
          isFirst={i === 0}
          isStreaming={message.isStreaming && i === message.paragraphs.length - 1}
        />
      ))}
      {!message.isStreaming && (
        <GlobalThreadFooter
          hasThread={hasGlobalThread}
          participants={message.globalThreadParticipants}
          onOpen={() => onThreadOpen?.(globalId)}
        />
      )}
      {!hasGlobalThread && !message.isStreaming && <ParagraphDivider />}
    </article>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function ChatStream({
  messages: messagesProp,
  onThreadOpen,
  className = "",
}: ChatStreamProps) {
  const [internalMessages] = useState(MOCK_MESSAGES);
  const messages = messagesProp ?? internalMessages;

  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      {messages.map((msg) =>
        msg.kind === "user" ? (
          <UserBubble key={msg.id} message={msg} />
        ) : (
          <AiResponse key={msg.id} message={msg} onThreadOpen={onThreadOpen} />
        ),
      )}
    </div>
  );
}
