import { useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import hljs from 'highlight.js/lib/core';
import bash from 'highlight.js/lib/languages/bash';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import css from 'highlight.js/lib/languages/css';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';
import markdown from 'highlight.js/lib/languages/markdown';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import { Sparkles, CornerDownRight, MoreHorizontal, GitBranch, Check, Copy } from 'lucide-react';
import { formatMessageDate } from '../types/message';

hljs.registerLanguage('bash', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('c', c);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('csharp', csharp);
hljs.registerLanguage('cs', csharp);
hljs.registerLanguage('css', css);
hljs.registerLanguage('go', go);
hljs.registerLanguage('java', java);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('kotlin', kotlin);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('md', markdown);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('yml', yaml);

const COLORS = {
  chatBg: '#191919',
  myBubble: '#0F0F0F',
  otherBubble: '#252525',
  gutterLine: '#3E3E3E',
  divider: '#232323',
  iconDefault: '#737373',
  iconHover: '#fbbf24',
  accent: '#fbbf24',
  menuBg: '#2D2D2D',
  menuBorder: '#424242',
  menuMuted: '#949494',
  menuText: '#EDEDED',
  codeBg: '#1a1a1a',
  codeHeader: '#242424',
  tableBorder: '#333333',
  tableHeader: '#1f1f1f',
  aiCard: '#141414',
  aiCardBorder: '#2a2a2a',
};

const BUBBLE_RADIUS_LG = 16;
const BUBBLE_RADIUS_SM = 6;

const NAME_COLORS = [
  '#F5A623',
  '#FFBC50',
  '#82AAFF',
  '#C3E88D',
  '#C792EA',
  '#F78C6C',
  '#89DDFF',
  '#F87171',
];

function colorFromName(name) {
  const value = String(name || '');
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return NAME_COLORS[hash % NAME_COLORS.length];
}

function userAuthorKey(msg) {
  if (!msg || msg.type !== 'user') return null;
  if (msg.isMe) return '__me__';
  return msg.authorName || msg.authorInitials || msg.id;
}

function isSameUser(a, b) {
  const keyA = userAuthorKey(a);
  const keyB = userAuthorKey(b);
  return Boolean(keyA && keyB && keyA === keyB);
}

function bubbleBorderRadius({ isMe, isFirst, isLast }) {
  const topStack = isFirst ? BUBBLE_RADIUS_LG : BUBBLE_RADIUS_SM;
  const bottomStack = isLast ? 0 : BUBBLE_RADIUS_SM;
  if (isMe) {
    return `${BUBBLE_RADIUS_LG}px ${topStack}px ${bottomStack}px ${BUBBLE_RADIUS_LG}px`;
  }
  return `${topStack}px ${BUBBLE_RADIUS_LG}px ${BUBBLE_RADIUS_LG}px ${bottomStack}px`;
}

const MD_STYLES = `
.md-body {
  font-size: 15px;
  line-height: 1.7;
  color: #d4d4d4;
  word-break: break-word;
  overflow-wrap: anywhere;
}
.md-body > :first-child { margin-top: 0; }
.md-body > :last-child { margin-bottom: 0; }
.md-body p { margin: 0 0 0.9em; }
.md-body p:last-child { margin-bottom: 0; }
.md-body h1, .md-body h2, .md-body h3, .md-body h4 {
  color: #EDEDED;
  font-weight: 600;
  line-height: 1.35;
  margin: 1.25em 0 0.55em;
}
.md-body h1 { font-size: 1.35rem; }
.md-body h2 { font-size: 1.2rem; }
.md-body h3 { font-size: 1.05rem; }
.md-body h4 { font-size: 0.95rem; }
.md-body ul, .md-body ol {
  margin: 0 0 0.9em;
  padding-left: 1.4em;
}
.md-body li { margin: 0.25em 0; }
.md-body li > p { margin: 0.25em 0; }
.md-body ul { list-style: disc; }
.md-body ol { list-style: decimal; }
.md-body strong { color: #EDEDED; font-weight: 600; }
.md-body em { font-style: italic; }
.md-body a { color: #fbbf24; text-decoration: underline; text-underline-offset: 2px; }
.md-body a:hover { color: #ffd27a; }
.md-body hr {
  border: none;
  border-top: 1px solid #2a2a2a;
  margin: 1.25em 0;
}
.md-body blockquote {
  margin: 0.9em 0;
  padding: 0.15em 0 0.15em 0.9em;
  border-left: 3px solid #424242;
  color: #a3a3a3;
}
.md-body blockquote p { margin: 0.35em 0; }
.md-inline-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.88em;
  background: #1f1f1f;
  color: #EDEDED;
  border: 1px solid #333;
  border-radius: 6px;
  padding: 0.12em 0.4em;
}
.md-code-block {
  margin: 0.9em 0;
  border: 1px solid #333;
  border-radius: 12px;
  overflow: hidden;
  background: #1a1a1a;
}
.md-code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0.45rem 0.75rem;
  background: #242424;
  border-bottom: 1px solid #333;
}
.md-code-lang {
  font-size: 12px;
  color: #949494;
  text-transform: lowercase;
}
.md-code-copy {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  color: #949494;
  font-size: 12px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 6px;
}
.md-code-copy:hover { background: #333; color: #EDEDED; }
.md-code-pre {
  margin: 0;
  padding: 0.9rem 1rem;
  overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;
  line-height: 1.55;
  color: #E5E5E5;
  background: transparent;
  white-space: pre;
  tab-size: 4;
}
.md-code-pre code {
  font-family: inherit;
  font-size: inherit;
  background: none;
  border: none;
  padding: 0;
  color: inherit;
  white-space: pre;
}
.md-code-pre .hljs-comment,
.md-code-pre .hljs-quote { color: #6b7280; font-style: italic; }
.md-code-pre .hljs-keyword,
.md-code-pre .hljs-selector-tag,
.md-code-pre .hljs-literal { color: #c792ea; }
.md-code-pre .hljs-built_in,
.md-code-pre .hljs-type,
.md-code-pre .hljs-params { color: #ffcb6b; }
.md-code-pre .hljs-string,
.md-code-pre .hljs-doctag,
.md-code-pre .hljs-template-tag,
.md-code-pre .hljs-template-variable { color: #c3e88d; }
.md-code-pre .hljs-number,
.md-code-pre .hljs-symbol,
.md-code-pre .hljs-bullet { color: #f78c6c; }
.md-code-pre .hljs-title,
.md-code-pre .hljs-section,
.md-code-pre .hljs-name,
.md-code-pre .hljs-selector-id,
.md-code-pre .hljs-selector-class { color: #82aaff; }
.md-code-pre .hljs-attr,
.md-code-pre .hljs-attribute,
.md-code-pre .hljs-variable,
.md-code-pre .hljs-property { color: #ffcb6b; }
.md-code-pre .hljs-meta,
.md-code-pre .hljs-meta .hljs-keyword { color: #89ddff; }
.md-code-pre .hljs-function .hljs-title,
.md-code-pre .hljs-title.function_ { color: #82aaff; }
.md-code-pre .hljs-subst { color: #E5E5E5; }
.md-code-pre .hljs-addition { color: #c3e88d; }
.md-code-pre .hljs-deletion { color: #f07178; }
.md-code-pre .hljs-regexp { color: #89ddff; }
.md-table-wrap {
  margin: 0.9em 0;
  overflow-x: auto;
  border: 1px solid #333;
  border-radius: 12px;
}
.md-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  line-height: 1.45;
}
.md-table th, .md-table td {
  padding: 0.65rem 0.85rem;
  border-bottom: 1px solid #333;
  text-align: left;
  vertical-align: top;
}
.md-table th {
  background: #1f1f1f;
  color: #EDEDED;
  font-weight: 600;
  white-space: nowrap;
}
.md-table tr:last-child td { border-bottom: none; }
.md-table tbody tr:hover td { background: rgba(255,255,255,0.02); }
.msg-bubble-code {
  padding: 8px 8px 8px 10px;
}
.msg-bubble-code .md-code-block {
  margin: 0;
}
.msg-code-group + .msg-code-group,
.msg-user-text + .msg-code-group,
.msg-code-group + .msg-user-text {
  margin-top: 8px;
}
.msg-user-text {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}
`;

function escapeHtml(code) {
  return code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function highlightCode(code, language) {
  try {
    if (language && hljs.getLanguage(language)) {
      const result = hljs.highlight(code, { language });
      return { html: result.value, language: result.language || language };
    }
    const result = hljs.highlightAuto(code);
    return { html: result.value, language: result.language || '' };
  } catch {
    return { html: escapeHtml(code), language: language || '' };
  }
}

function parseTelegramCodeParts(text) {
  const src = String(text ?? '');
  const parts = [];
  let i = 0;

  while (i < src.length) {
    const start = src.indexOf('```', i);
    if (start === -1) {
      parts.push({ type: 'text', value: src.slice(i) });
      break;
    }
    if (start > i) {
      parts.push({ type: 'text', value: src.slice(i, start) });
    }

    const after = start + 3;
    const close = src.indexOf('```', after);
    if (close === -1) {
      parts.push({ type: 'text', value: src.slice(start) });
      break;
    }

    const inner = src.slice(after, close).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    let language = '';
    let code = inner;
    const nl = inner.indexOf('\n');

    if (nl !== -1) {
      const firstLine = inner.slice(0, nl).trim();
      if (firstLine && /^[\w+-]+$/.test(firstLine)) {
        language = firstLine;
        code = inner.slice(nl + 1).replace(/\n$/, '');
      } else if (!firstLine) {
        code = inner.slice(nl + 1).replace(/\n$/, '');
      } else {
        code = inner.replace(/^\n/, '').replace(/\n$/, '');
      }
    } else {
      const trimmed = inner.trim();
      const match = trimmed.match(/^([\w+-]+)\s+([\s\S]+)$/);
      if (match && hljs.getLanguage(match[1])) {
        language = match[1];
        code = match[2];
      } else {
        code = trimmed;
      }
    }

    parts.push({ type: 'code', language, code });
    i = close + 3;
  }

  return parts.filter((part, idx) => {
    if (part.type !== 'text') return true;
    if (part.value.trim() !== '') return true;
    return idx !== 0 && idx !== parts.length - 1;
  });
}

function CodeBlock({ language, children }) {
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, '');
  const highlighted = useMemo(() => highlightCode(code, language), [code, language]);
  const lang = language || highlighted.language;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  }

  return (
    <div className="md-code-block">
      <div className="md-code-header">
        <span className="md-code-lang">{lang || 'code'}</span>
        <button type="button" className="md-code-copy" onClick={() => void handleCopy()}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Скопировано' : 'Копировать'}
        </button>
      </div>
      <pre className="md-code-pre">
        <code
          className={lang ? `language-${lang}` : undefined}
          dangerouslySetInnerHTML={{ __html: highlighted.html }}
        />
      </pre>
    </div>
  );
}

const markdownComponents = {
  p: ({ children }) => <p>{children}</p>,
  strong: ({ children }) => <strong>{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  ul: ({ children }) => <ul>{children}</ul>,
  ol: ({ children }) => <ol>{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  h1: ({ children }) => <h1>{children}</h1>,
  h2: ({ children }) => <h2>{children}</h2>,
  h3: ({ children }) => <h3>{children}</h3>,
  h4: ({ children }) => <h4>{children}</h4>,
  hr: () => <hr />,
  blockquote: ({ children }) => <blockquote>{children}</blockquote>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  table: ({ children }) => (
    <div className="md-table-wrap">
      <table className="md-table">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead>{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => <th>{children}</th>,
  td: ({ children }) => <td>{children}</td>,
  pre: ({ children }) => <>{children}</>,
  code: ({ className, children }) => {
    const match = /language-(\w+)/.exec(className || '');
    const text = String(children);
    const isBlock = Boolean(match) || text.includes('\n');
    if (isBlock) {
      return <CodeBlock language={match?.[1]}>{children}</CodeBlock>;
    }
    return <code className="md-inline-code">{children}</code>;
  },
};

function MarkdownText({ text }) {
  return (
    <div className="md-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {text}
      </ReactMarkdown>
    </div>
  );
}

function UserInlineText({ text }) {
  const nodes = [];
  const src = String(text ?? '');
  const re = /`([^`]+)`/g;
  let last = 0;
  let match;
  let key = 0;

  while ((match = re.exec(src)) !== null) {
    if (match.index > last) {
      nodes.push(<span key={key}>{src.slice(last, match.index)}</span>);
      key += 1;
    }
    nodes.push(
      <code key={key} className="md-inline-code">
        {match[1]}
      </code>,
    );
    key += 1;
    last = match.index + match[0].length;
  }

  if (last < src.length) {
    nodes.push(<span key={key}>{src.slice(last)}</span>);
  }

  return <span className="msg-user-text">{nodes}</span>;
}

function UserRichText({ parts }) {
  return parts.map((part, index) => {
    if (part.type === 'code') {
      return (
        <div key={`code-${index}`} className="msg-code-group">
          <CodeBlock language={part.language}>{part.code}</CodeBlock>
        </div>
      );
    }
    return <UserInlineText key={`text-${index}`} text={part.value} />;
  });
}

function Avatar({ label, isAI, size = 'sm', accentColor }) {
  const dim = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-9 h-9 text-sm';
  const style = isAI
    ? { background: COLORS.accent, color: '#1a1200' }
    : {
        background: '#1f1f1f',
        color: accentColor || COLORS.accent,
        border: '1px solid #424242',
      };

  return (
    <div
      title={label}
      style={style}
      className={`shrink-0 ${dim} rounded-full flex items-center justify-center font-semibold select-none`}
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

const GENERATING_DOT_STYLES = `
@keyframes chat-generating-pulse {
  0%, 100% { opacity: 0.35; transform: scale(0.92); }
  50% { opacity: 1; transform: scale(1); }
}
.chat-generating-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 9999px;
  background: #fbbf24;
  animation: chat-generating-pulse 1.05s ease-in-out infinite;
}

@keyframes msg-user-in {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes msg-ai-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes msg-ai-body-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.msg-enter-user {
  transform-origin: bottom right;
  animation: msg-user-in 280ms cubic-bezier(0.32, 0.72, 0, 1) both;
}

.msg-enter-user-other {
  transform-origin: bottom left;
  animation: msg-user-in 280ms cubic-bezier(0.32, 0.72, 0, 1) both;
}

.msg-enter-ai {
  animation: msg-ai-in 260ms cubic-bezier(0.32, 0.72, 0, 1) both;
}

.msg-enter-ai-body {
  animation: msg-ai-body-in 220ms cubic-bezier(0.32, 0.72, 0, 1) both;
}

.msg-bubble-wrap {
  position: relative;
}
.msg-bubble {
  overflow: hidden;
}
.msg-bubble-tail {
  position: absolute;
  z-index: 1;
  bottom: 0;
  width: 9px;
  height: 17px;
  pointer-events: none;
  overflow: visible;
}
.msg-bubble-tail-left {
  left: -9px;
}
.msg-bubble-tail-right {
  right: -9px;
}

@media (prefers-reduced-motion: reduce) {
  .chat-generating-dot,
  .msg-enter-user,
  .msg-enter-user-other,
  .msg-enter-ai,
  .msg-enter-ai-body {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}
`;

function isLocalMessageId(id) {
  return typeof id === 'string' && id.startsWith('local-');
}

function GeneratingDot() {
  return (
    <div className="px-3.5 sm:px-4 py-3" aria-label="Генерирует ответ" role="status">
      <span className="chat-generating-dot" />
    </div>
  );
}

function snippetFromText(text, maxLen = 56) {
  const compact = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!compact) return '';
  if (compact.length <= maxLen) return compact;
  return `${compact.slice(0, maxLen).trimEnd()}…`;
}

function resolveReplyParent(messages, msg) {
  if (msg.parentId != null) {
    const byId = messages.find((item) => item.id === String(msg.parentId));
    if (byId) return byId;
  }
  const idx = messages.findIndex((item) => item.id === msg.id);
  for (let i = idx - 1; i >= 0; i -= 1) {
    if (messages[i].type === 'user') return messages[i];
  }
  return null;
}

function replyAuthorLabel(parent) {
  if (!parent) return null;
  if (parent.type === 'ai') return parent.modelName || 'ИИ';
  if (parent.isMe) return 'вы';
  return parent.authorName || parent.authorInitials || 'участник';
}

function CopyMessageButton({ text }) {
  const [copied, setCopied] = useState(false);
  const [hover, setHover] = useState(false);

  async function handleCopy() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore clipboard errors */
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="p-1.5 -m-1 rounded-md transition-colors duration-200"
      style={{ color: copied || hover ? COLORS.accent : COLORS.iconDefault, lineHeight: 0 }}
      aria-label={copied ? 'Скопировано' : 'Скопировать'}
      title={copied ? 'Скопировано' : 'Скопировать'}
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

/** Гаттер «обсудить абзац» — вернуть в AIResponse, когда будут треды. */
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

function MessageMoreMenu({ createdAt, branchActive, onBranch, alignRight = false }) {
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
          className={`absolute ${alignRight ? 'right-0' : 'left-0'} bottom-full mb-2 z-30 min-w-[220px] rounded-xl py-1.5 shadow-2xl menu-pop`}
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

function ReplyChip({ label, snippet }) {
  if (!label) return null;
  const preview = snippetFromText(snippet);
  return (
    <div className="flex items-center gap-1.5 min-w-0 mt-1.5" title={preview || label}>
      <CornerDownRight className="w-3 h-3 shrink-0" style={{ color: '#6b6b6b' }} />
      <span className="text-[11px] leading-[1.4] truncate py-px" style={{ color: '#8a8a8a' }}>
        {label}
        {preview ? (
          <span style={{ color: '#5c5c5c' }}>{` · «${preview}»`}</span>
        ) : null}
      </span>
    </div>
  );
}

function ResponseFooter({ text, createdAt, active, onBranch, userInitials }) {
  return (
    <div className="flex items-center min-w-0 gap-2 flex-wrap">
      {active ? (
        <div className="flex items-center gap-2 min-w-0">
          <AvatarStack labels={[userInitials]} />
          <span className="text-xs truncate" style={{ color: '#8a8a8a' }}>
            общий тред по этому ответу
          </span>
        </div>
      ) : null}
      <div className="ml-auto flex items-center gap-0.5">
        <CopyMessageButton text={text} />
        <MessageMoreMenu
          createdAt={createdAt}
          branchActive={active}
          onBranch={onBranch}
          alignRight
        />
      </div>
    </div>
  );
}

function BubbleTail({ isMe, color }) {
  const path = isMe
    ? 'M6 17H0V0c.193 2.84.876 5.767 2.05 8.782.904 2.325 2.446 4.485 4.625 6.48A1 1 0 016 17z'
    : 'M3 17h6V0c-.193 2.84-.876 5.767-2.05 8.782-.904 2.325-2.446 4.485-4.625 6.48A1 1 0 003 17z';

  return (
    <svg
      aria-hidden="true"
      className={`msg-bubble-tail ${isMe ? 'msg-bubble-tail-right' : 'msg-bubble-tail-left'}`}
      width="9"
      height="17"
      viewBox="0 0 9 17"
      overflow="visible"
    >
      <path d={path} fill={color} />
    </svg>
  );
}

function UserBubble({
  text,
  isMe,
  userInitials,
  authorName,
  showName,
  showAvatar,
  isFirst,
  isLast,
  animate,
}) {
  const nameColor = colorFromName(authorName || userInitials);
  const displayName = authorName || userInitials;
  const bubbleBg = isMe ? COLORS.myBubble : COLORS.otherBubble;
  const parts = useMemo(() => parseTelegramCodeParts(text), [text]);
  const hasCode = parts.some((part) => part.type === 'code');

  return (
    <div
      className={[
        'flex w-full min-w-0',
        isMe ? 'justify-end' : 'justify-start',
        animate ? (isMe ? 'msg-enter-user' : 'msg-enter-user-other') : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div
        className={`flex items-end gap-2 min-w-0 max-w-full ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
      >
        {showAvatar ? (
          <Avatar
            label={userInitials}
            isAI={false}
            size="md"
            accentColor={isMe ? undefined : nameColor}
          />
        ) : (
          <div className="w-9 h-9 shrink-0" aria-hidden="true" />
        )}
        <div
          className="msg-bubble-wrap min-w-0"
          style={{ maxWidth: hasCode ? 'min(88vw, 36rem)' : 'min(75vw, 28rem)' }}
        >
          <div
            className={[
              'msg-bubble text-sm leading-relaxed break-words [overflow-wrap:anywhere]',
              hasCode ? 'msg-bubble-code' : 'px-3.5 py-2 whitespace-pre-wrap',
            ].join(' ')}
            style={{
              background: bubbleBg,
              color: '#d4d4d4',
              borderRadius: bubbleBorderRadius({ isMe, isFirst, isLast }),
            }}
          >
            {showName && displayName ? (
              <p
                className="text-[13px] font-semibold leading-[1.35] mb-1.5 truncate"
                style={{ color: nameColor }}
                title={displayName}
              >
                {displayName}
              </p>
            ) : null}
            <UserRichText parts={parts} />
          </div>
          {isLast ? <BubbleTail isMe={isMe} color={bubbleBg} /> : null}
        </div>
      </div>
    </div>
  );
}

function AIResponse({
  text,
  modelName,
  createdAt,
  isStreaming,
  footerActive,
  onFooterOpen,
  userInitials,
  animate,
  replyLabel,
  replySnippet,
}) {
  const waitingForFirstToken = isStreaming && !text?.trim();
  const hadBodyRef = useRef(!waitingForFirstToken);
  const bodyJustAppeared = !waitingForFirstToken && !hadBodyRef.current;
  if (!waitingForFirstToken) {
    hadBodyRef.current = true;
  }

  return (
    <div className={['py-1', animate ? 'msg-enter-ai' : ''].filter(Boolean).join(' ')}>
      <div
        style={{
          background: COLORS.aiCard,
          border: `1px solid ${COLORS.aiCardBorder}`,
          borderRadius: 16,
          boxShadow: `inset 3px 0 0 ${COLORS.accent}`,
        }}
      >
        <div className="px-3.5 sm:px-4 pt-3 pb-1">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar label={modelName || 'AI'} isAI />
            <span
              className="text-[13px] font-medium truncate"
              style={{ color: '#EDEDED' }}
              title={modelName || 'ИИ'}
            >
              {modelName || 'ИИ'}
            </span>
            <span
              className="shrink-0 text-[10px] font-semibold tracking-wide px-1.5 py-0.5 rounded-md"
              style={{
                color: COLORS.accent,
                background: 'rgba(251, 191, 36, 0.12)',
              }}
            >
              ИИ
            </span>
          </div>
          <ReplyChip label={replyLabel} snippet={replySnippet} />
        </div>

        {waitingForFirstToken ? (
          <GeneratingDot />
        ) : (
          <div
            className={['px-3.5 sm:px-4 py-2', bodyJustAppeared ? 'msg-enter-ai-body' : '']
              .filter(Boolean)
              .join(' ')}
          >
            <MarkdownText text={text} />
          </div>
        )}

        {!isStreaming && (
          <div className="px-3 sm:px-3.5 pb-2.5">
            <ResponseFooter
              text={text}
              createdAt={createdAt}
              active={footerActive}
              onBranch={onFooterOpen}
              userInitials={userInitials}
            />
          </div>
        )}
      </div>
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
    <div className="w-full">
      <style>{`${MD_STYLES}${GENERATING_DOT_STYLES}`}</style>

      {messages.length === 0 && (
        <p className="text-center text-sm py-16" style={{ color: '#737373' }}>
          Начните диалог — введите сообщение или наберите @ для выбора модели
        </p>
      )}

      {messages.map((msg, index) => {
        const animate = isLocalMessageId(msg.id);
        const prev = messages[index - 1];
        const next = messages[index + 1];
        const groupedPrev = isSameUser(prev, msg);
        const marginTop = index === 0 ? 0 : groupedPrev ? 2 : 10;

        if (msg.type === 'user') {
          const mine = msg.isMe === true;
          const isFirst = !groupedPrev;
          const isLast = !isSameUser(msg, next);
          return (
            <div key={msg.id} style={{ marginTop }}>
              <UserBubble
                text={msg.text}
                isMe={mine}
                userInitials={mine ? userInitials : (msg.authorInitials || '?')}
                authorName={msg.authorName}
                showName={!mine && isFirst}
                showAvatar={isLast}
                isFirst={isFirst}
                isLast={isLast}
                animate={animate}
              />
            </div>
          );
        }

        const parent = resolveReplyParent(messages, msg);
        return (
          <div key={msg.id} style={{ marginTop }}>
            <AIResponse
              text={msg.text}
              modelName={msg.modelName}
              createdAt={msg.createdAt}
              isStreaming={msg.isStreaming}
              footerActive={!!footerActive[msg.id]}
              onFooterOpen={() => onFooterOpen(msg.id)}
              userInitials={userInitials}
              animate={animate}
              replyLabel={replyAuthorLabel(parent)}
              replySnippet={parent?.contextTextSnippet || parent?.text}
            />
          </div>
        );
      })}
    </div>
  );
}
