import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, CornerDownRight, MoreHorizontal, GitBranch } from 'lucide-react';
import { formatMessageDate, splitIntoParagraphs } from '../types/message';

const COLORS = {
  chatBg: '#191919',
  myBubble: '#0F0F0F',
  otherBubble: '#252525',
  gutterLine: '#3E3E3E',
  divider: '#232323',
  dot: '#4d4d4d',
  iconDefault: '#737373',
  iconHover: '#fbbf24',
  accent: '#fbbf24',
  menuBg: '#2D2D2D',
  menuBorder: '#424242',
  menuMuted: '#949494',
  menuText: '#EDEDED',
};

const markdownComponents = {
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  strong: ({ children }) => (
    <strong className="font-semibold" style={{ color: '#EDEDED' }}>
      {children}
    </strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => (
    <h1 className="text-lg font-semibold mb-2 mt-1" style={{ color: '#EDEDED' }}>
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-semibold mb-2 mt-1" style={{ color: '#EDEDED' }}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold mb-1.5 mt-1" style={{ color: '#EDEDED' }}>
      {children}
    </h3>
  ),
  code: ({ children }) => (
    <code
      className="px-1.5 py-0.5 rounded text-[0.9em]"
      style={{ background: '#1f1f1f', color: '#EDEDED' }}
    >
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre
      className="my-2 p-3 rounded-xl overflow-x-auto text-sm"
      style={{ background: '#1f1f1f', color: '#EDEDED' }}
    >
      {children}
    </pre>
  ),
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: COLORS.accent }}>
      {children}
    </a>
  ),
};

function MarkdownText({ text }) {
  return (
    <div className="text-base leading-relaxed break-words [overflow-wrap:anywhere]" style={{ color: '#d4d4d4' }}>
      <ReactMarkdown components={markdownComponents}>{text}</ReactMarkdown>
    </div>
  );
}

function Avatar({ label, isAI, size = 'sm' }) {
  const dim = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-9 h-9 text-sm';
  const style = isAI
    ? { background: COLORS.accent, color: '#1a1200' }
    : { background: '#3a3a3a', color: '#d4d4d4' };

  return (
    <div
      title={label}
      style={style}
      className={`shrink-0 ${dim} rounded-full flex items-center justify-center font-medium select-none`}
    >
      {isAI ? <Sparkles className="w-3 h-3" /> : label.slice(0, 2)}
    </div>
  );
}

function AvatarStack({ labels }) {
  const [hover, setHover] = useState(false);
  return (
    <div className="flex items-center" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {labels.map((label, i) => (
        <div
          key={`${label}-${i}`}
          className="transition-all duration-200"
          style={{
            marginLeft: i === 0 ? 0 : hover ? 6 : -3,
            boxShadow: `0 0 0 2px ${COLORS.chatBg}`,
            borderRadius: '9999px',
          }}
        >
          <Avatar label={label} isAI={false} />
        </div>
      ))}
    </div>
  );
}

function Dot() {
  return (
    <span
      className="inline-block shrink-0"
      style={{ width: 4, height: 4, borderRadius: '9999px', background: COLORS.dot }}
    />
  );
}

function Paragraph({ id, text, activeThread, onOpen, userInitials }) {
  const [hoverP, setHoverP] = useState(false);
  const [hoverIcon, setHoverIcon] = useState(false);
  const isActive = activeThread === id;
  const showGutter = hoverP && !isActive;

  return (
    <div
      className="flex items-stretch"
      onMouseEnter={() => setHoverP(true)}
      onMouseLeave={() => {
        setHoverP(false);
        setHoverIcon(false);
      }}
    >
      <div
        className="flex items-center justify-center transition-opacity duration-200"
        style={{
          width: 28,
          marginRight: 4,
          opacity: isActive ? 0 : showGutter ? 1 : undefined,
        }}
      >
        <button
          type="button"
          onClick={() => onOpen(id)}
          onMouseEnter={() => setHoverIcon(true)}
          onMouseLeave={() => setHoverIcon(false)}
          className={[
            'p-1.5 -m-1 transition-colors duration-200',
            !isActive && !showGutter ? 'opacity-40 [@media(hover:hover)]:opacity-0' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={{ color: hoverIcon ? COLORS.iconHover : COLORS.iconDefault, lineHeight: 0 }}
          aria-label="начать обсуждение абзаца"
        >
          <CornerDownRight className="w-4 h-4" />
        </button>
      </div>

      <div
        className="transition-colors duration-200"
        style={{ width: 2, marginRight: 12, background: showGutter ? COLORS.gutterLine : 'transparent' }}
      />

      <div className="flex-1 min-w-0 py-2.5">
        <MarkdownText text={text} />

        {isActive && (
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <AvatarStack labels={[userInitials]} />
            <span className="text-xs" style={{ color: '#8a8a8a' }}>
              обсуждают этот абзац
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageMoreMenu({ createdAt, branchActive, onBranch }) {
  const [open, setOpen] = useState(false);
  const [hoverBtn, setHoverBtn] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function onKeyDown(event) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const dateLabel = createdAt ? formatMessageDate(createdAt) : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setHoverBtn(true)}
        onMouseLeave={() => setHoverBtn(false)}
        className="p-1.5 -m-1 rounded-md transition-colors duration-200"
        style={{ color: open || hoverBtn ? COLORS.accent : COLORS.iconDefault, lineHeight: 0 }}
        aria-label="Действия с сообщением"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 bottom-full mb-2 z-30 min-w-[220px] rounded-xl py-1.5 shadow-2xl"
          style={{
            background: COLORS.menuBg,
            border: `1px solid ${COLORS.menuBorder}`,
          }}
        >
          {dateLabel && (
            <p className="px-3.5 pt-1.5 pb-2 text-xs" style={{ color: COLORS.menuMuted }}>
              {dateLabel}
            </p>
          )}

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onBranch();
              setOpen(false);
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-sm transition-colors"
            style={{ color: COLORS.menuText }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#3C3C3C';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <GitBranch className="w-4 h-4 shrink-0" style={{ color: COLORS.menuMuted }} />
            <span>{branchActive ? 'Скрыть ветку' : 'Ветка в новом чате'}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function ResponseFooter({ modelName, createdAt, active, onBranch, userInitials }) {
  return (
    <div className="flex items-center pl-7 sm:pl-9 min-w-0 flex-wrap gap-y-2">
      <Avatar label={modelName || 'AI'} isAI />
      <div style={{ marginLeft: 12, height: 24, display: 'flex', alignItems: 'center' }}>
        <Dot />
      </div>
      <div style={{ marginLeft: 12, height: 24 }} className="flex items-center gap-2 min-w-0">
        {active ? (
          <>
            <AvatarStack labels={[userInitials]} />
            <span className="text-xs truncate" style={{ color: '#8a8a8a' }}>
              общий тред по этому ответу
            </span>
          </>
        ) : null}
        <MessageMoreMenu createdAt={createdAt} branchActive={active} onBranch={onBranch} />
      </div>
    </div>
  );
}

function UserBubble({ text, isMe, userInitials }) {
  const radius = isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px';
  return (
    <div className={`flex items-end gap-2 min-w-0 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
      <Avatar label={userInitials} isAI={false} size="md" />
      <div
        style={{
          maxWidth: 'min(75%, 100%)',
          background: isMe ? COLORS.myBubble : COLORS.otherBubble,
          color: '#d4d4d4',
          borderRadius: radius,
        }}
        className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] min-w-0"
      >
        {text}
      </div>
    </div>
  );
}

function AIResponse({
  messageId,
  paragraphs,
  modelName,
  createdAt,
  isStreaming,
  activeThread,
  onThreadOpen,
  footerActive,
  onFooterOpen,
  userInitials,
}) {
  return (
    <div className="py-1">
      {paragraphs.map((p) => (
        <Paragraph
          key={p.id}
          id={p.id}
          text={p.text}
          activeThread={activeThread}
          onOpen={onThreadOpen}
          userInitials={userInitials}
        />
      ))}
      {isStreaming && (
        <p className="text-sm pl-9 py-1 animate-pulse" style={{ color: '#8a8a8a' }}>
          генерирует ответ…
        </p>
      )}
      <ResponseFooter
        modelName={modelName}
        createdAt={createdAt}
        active={footerActive}
        onBranch={onFooterOpen}
        userInitials={userInitials}
      />
      <div style={{ height: 1, background: COLORS.divider, marginTop: 16 }} />
    </div>
  );
}

/**
 * @param {{ messages: import('../types/message').Message[], userInitials?: string }} props
 */
export default function ChatThreading({ messages = [], userInitials = 'Я' }) {
  const [activeThread, setActiveThread] = useState(null);
  const [footerActive, setFooterActive] = useState({});

  function onThreadOpen(paragraphId) {
    setActiveThread((prev) => (prev === paragraphId ? null : paragraphId));
  }

  function onFooterOpen(messageId) {
    onThreadOpen(`global-${messageId}`);
    setFooterActive((prev) => ({ ...prev, [messageId]: !prev[messageId] }));
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {messages.length === 0 && (
        <p className="text-center text-sm py-16" style={{ color: '#737373' }}>
          Начните диалог — введите сообщение или наберите @ для выбора модели
        </p>
      )}

      {messages.map((msg) => {
        if (msg.type === 'user') {
          return (
            <UserBubble
              key={msg.id}
              text={msg.text}
              isMe={msg.isMe !== false}
              userInitials={userInitials}
            />
          );
        }

        const paragraphs = splitIntoParagraphs(msg.text);
        return (
          <AIResponse
            key={msg.id}
            messageId={msg.id}
            paragraphs={paragraphs}
            modelName={msg.modelName}
            createdAt={msg.createdAt}
            isStreaming={msg.isStreaming}
            activeThread={activeThread}
            onThreadOpen={onThreadOpen}
            footerActive={!!footerActive[msg.id]}
            onFooterOpen={() => onFooterOpen(msg.id)}
            userInitials={userInitials}
          />
        );
      })}
    </div>
  );
}
