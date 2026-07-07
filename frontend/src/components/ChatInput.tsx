'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Mic,
  ArrowUp,
  Bot,
  Users,
  type LucideIcon,
} from 'lucide-react';

// ────────────────────────────────────────────────────────────────────────────
// Точные цвета/отступы/выравнивание живут в обычном CSS-блоке (не в Tailwind
// arbitrary-value классах) — так они гарантированно применяются в любой сборке.
// ────────────────────────────────────────────────────────────────────────────

const CHAT_INPUT_STYLES = `
.cip-root { position: relative; width: 100%; max-width: 36rem; margin: 0 auto; }

.cip-box {
  position: relative;
  background: #2D2D2D;
  border: 1px solid #424242;
  border-radius: 24px;
  padding: 6px;
}
.cip-box.cip-row { height: 48px; display: flex; align-items: center; gap: 8px; }
.cip-box.cip-col { display: flex; flex-direction: column; gap: 6px; min-height: 48px; }

.cip-icon-btn {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #2D2D2D;
  border: none;
  color: #C7C7C7;
  cursor: pointer;
  transition: background-color .1s ease;
  padding: 0;
}
.cip-icon-btn:hover { background: #424242; }

.cip-send-cluster { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.cip-separator-dot { width: 4px; height: 4px; border-radius: 999px; background: #2D2D2D; flex-shrink: 0; }
.cip-send-label { font-size: 14px; color: #C7C7C7; white-space: nowrap; }
.cip-send-btn { background: #F5A623; color: #1a1a1a; }
.cip-send-btn:hover { background: #ffb64a; }

.cip-controls-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }

.cip-editable-wrap { position: relative; display: grid; flex: 1; min-width: 0; }
.cip-editable, .cip-placeholder { grid-area: 1 / 1; }
.cip-editable {
  outline: none;
  font-size: 15px;
  line-height: 24px;
  color: #EDEDED;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 160px;
  overflow-y: auto;
  padding: 6px 2px;
}
.cip-placeholder {
  pointer-events: none;
  align-self: start;
  color: #949494;
  font-size: 15px;
  line-height: 24px;
  padding: 6px 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Скрытый клон-измеритель: та же ширина, что и текстовая колонка в РАЗВЁРНУТОМ
   (col) режиме, ПОСТОЯННАЯ независимо от текущего визуального режима. Именно
   разная ширина при измерении в предыдущей версии вызывала дрожание переноса. */
.cip-measure {
  position: absolute;
  left: 6px;
  right: 6px;
  top: 0;
  visibility: hidden;
  height: 0;
  overflow: hidden;
  font-size: 15px;
  line-height: 24px;
  white-space: pre-wrap;
  word-break: break-word;
  padding: 6px 2px;
  pointer-events: none;
}

/* Меню подсказок (@) — один контейнер, один общий скролл */
.cip-menu {
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 8px;
  width: 100%;
  max-width: 320px;
  background: #2D2D2D;
  border: 1px solid #424242;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0,0,0,.5);
  z-index: 50;
  overflow: hidden;
}
.cip-menu-scroll { max-height: 290px; overflow-y: auto; padding: 6px 0; }
.cip-group-label {
  padding: 6px 12px 4px;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: .04em;
  text-transform: uppercase;
  color: #949494;
}
.cip-menu-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background-color .1s ease;
}
.cip-menu-row.cip-active { background: #3C3C3C; }
.cip-row-name { font-size: 14px; color: #EDEDED; display: block; }
.cip-row-sub { font-size: 12px; color: #949494; display: block; }
.cip-row-count { font-size: 12px; color: #949494; display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.cip-dot { width: 6px; height: 6px; border-radius: 999px; background: #6B6B6B; }
.cip-dot.cip-on { background: #F5A623; }
.cip-no-results { padding: 24px 12px; text-align: center; color: #949494; font-size: 13px; }

/* Тег в тексте — без рамок/фона, на базовой линии. Текст ВСЕГДА жёлтый, цвет не
   меняется по ховеру. Иконка/аватар и крестик — СВОЙ отдельный hover-таргет,
   не зависящий от ховера по имени. Нет user-select:none — тег участвует в выделении. */
.cip-token {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  vertical-align: -3px;
  margin: 0 1px;
  line-height: 24px;
}
.cip-token-icon {
  position: relative;
  width: 16px;
  height: 16px;
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
  cursor: pointer;
}
.cip-token-icon-default { position: absolute; inset: 0; display: grid; place-items: center; transition: opacity .1s ease; }
.cip-token-icon:hover .cip-token-icon-default { opacity: 0; }
.cip-token-icon-remove {
  position: absolute; inset: 0; display: grid; place-items: center; border-radius: 999px;
  background: #FF9D00; color: #191919; font-size: 10px; line-height: 1; opacity: 0;
  transition: opacity .1s ease;
}
.cip-token-icon:hover .cip-token-icon-remove { opacity: 1; }
.cip-token-name { color: #FFBC50; cursor: pointer; }

.cip-mention-live { color: #FFBC50; }
`;

// ────────────────────────────────────────────────────────────────────────────
// Данные (иконки моделей — временные заглушки, замените на свои SVG)
// ────────────────────────────────────────────────────────────────────────────

export type FlatItem = ({ kind: 'model' } & InputAiModel) | ({ kind: 'member' } & InputTeamMember);

export interface InputAiModel {
  id: string;
  name: string;
  desc: string;
  count: number;
  Icon: LucideIcon;
}

export interface InputTeamMember {
  id: string;
  name: string;
  role: string;
  initials: string;
  colorHex: string;
}

function getFilteredLists(
  query: string,
  aiModels: InputAiModel[],
  teamMembers: InputTeamMember[],
): { models: InputAiModel[]; members: InputTeamMember[]; flat: FlatItem[] } {
  const q = query.trim().toLowerCase();
  const models = aiModels.filter((m) => m.name.toLowerCase().includes(q));
  const members = teamMembers.filter((m) => m.name.toLowerCase().includes(q));
  const flat: FlatItem[] = [
    ...models.map((m): FlatItem => ({ kind: 'model', ...m })),
    ...members.map((m): FlatItem => ({ kind: 'member', ...m })),
  ];
  return { models, members, flat };
}

function findExactMatch(name: string, aiModels: InputAiModel[], teamMembers: InputTeamMember[]): FlatItem | null {
  const n = name.trim().toLowerCase();
  const model = aiModels.find((m) => m.name.toLowerCase() === n);
  if (model) return { kind: 'model', ...model };
  const member = teamMembers.find((m) => m.name.toLowerCase() === n);
  if (member) return { kind: 'member', ...member };
  return null;
}

function getFullFlatIndex(kind: 'model' | 'member', id: string, aiModels: InputAiModel[], teamMembers: InputTeamMember[]): number {
  if (kind === 'model') return aiModels.findIndex((m) => m.id === id);
  return aiModels.length + teamMembers.findIndex((m) => m.id === id);
}

// ────────────────────────────────────────────────────────────────────────────
// Типы состояний
// ────────────────────────────────────────────────────────────────────────────

type MentionAnchor =
  | { mode: 'range'; node: Text; start: number; end: number }
  | { mode: 'token'; tokenEl: HTMLElement }
  | { mode: 'none' };

interface SendConfig {
  label: string;
  icon: 'debate' | 'model' | 'arrow';
}

// ────────────────────────────────────────────────────────────────────────────
// Вспомогательные функции работы с contentEditable / Selection API
// ────────────────────────────────────────────────────────────────────────────

function getTextBeforeCaret(root: HTMLElement): { text: string; node: Text | null; offset: number } {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return { text: '', node: null, offset: 0 };
  const range = sel.getRangeAt(0);
  if (!root.contains(range.startContainer)) return { text: '', node: null, offset: 0 };
  const node = range.startContainer;
  if (node.nodeType === Node.TEXT_NODE) {
    return {
      text: (node.textContent || '').slice(0, range.startOffset),
      node: node as Text,
      offset: range.startOffset,
    };
  }
  return { text: '', node: null, offset: 0 };
}

function placeCaretAfter(node: Node) {
  const sel = window.getSelection();
  if (!sel) return;
  const r = document.createRange();
  r.setStartAfter(node);
  r.collapse(true);
  sel.removeAllRanges();
  sel.addRange(r);
}

function placeCaretAtTextEnd(node: Text) {
  const sel = window.getSelection();
  if (!sel) return;
  const r = document.createRange();
  r.setStart(node, node.length);
  r.collapse(true);
  sel.removeAllRanges();
  sel.addRange(r);
}

function isRootEmpty(root: HTMLElement): boolean {
  return (root.textContent || '').trim().length === 0;
}

/** Снимает жёлтую "живую" подсветку "@query" и возвращает НОВЫЙ текстовый узел (без обращения к Selection). */
function unwrapMentionLiveNode(root: HTMLElement): Text | null {
  const span = root.querySelector<HTMLElement>('.cip-mention-live');
  if (!span) return null;
  const text = document.createTextNode(span.textContent || '');
  span.replaceWith(text);
  return text;
}

/**
 * Убирает пустые блочные обёртки, которые браузер иногда оставляет после удаления
 * текста перед тегом, и гарантирует, что сразу после каждого тега есть обычный
 * текстовый узел — без него курсор может "прилипнуть" к стилю тега при наборе.
 */
function cleanupDom(root: HTMLElement) {
  root.querySelectorAll('div, p').forEach((el) => {
    if (!el.textContent?.trim() && el.querySelectorAll('[data-token]').length === 0) {
      el.remove();
    }
  });
  root.querySelectorAll<HTMLElement>('[data-token]').forEach((tokenEl) => {
    const next = tokenEl.nextSibling;
    if (!next || next.nodeType !== Node.TEXT_NODE) {
      tokenEl.after(document.createTextNode(''));
    }
  });
}

function modelGlyphSvg(): string {
  return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/></svg>';
}

/** Строит DOM-элемент "запечённого" инлайн-тега: без рамок/фона, иконка/аватар + жёлтое имя. */
function buildBadgeElement(item: FlatItem): HTMLElement {
  const badge = document.createElement('span');
  badge.setAttribute('contenteditable', 'false');
  badge.setAttribute('data-token', item.kind);
  badge.setAttribute('data-name', item.name);
  badge.setAttribute('data-id', item.id);
  badge.className = 'cip-token';

  const iconZone = document.createElement('span');
  iconZone.setAttribute('data-action', 'edit');
  iconZone.className = 'cip-token-icon';

  const iconDefault = document.createElement('span');
  iconDefault.className = 'cip-token-icon-default';
  if (item.kind === 'member') {
    iconDefault.innerHTML = `<span style="width:16px;height:16px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:600;color:#fff;background:${item.colorHex}">${item.initials}</span>`;
  } else {
    iconDefault.innerHTML = `<span style="color:#FFBC50;display:grid;place-items:center;width:16px;height:16px">${modelGlyphSvg()}</span>`;
  }

  const iconRemove = document.createElement('span');
  iconRemove.setAttribute('data-action', 'remove');
  iconRemove.setAttribute('aria-label', 'Удалить тег');
  iconRemove.className = 'cip-token-icon-remove';
  iconRemove.textContent = '✕';

  iconZone.append(iconDefault, iconRemove);

  const nameZone = document.createElement('span');
  nameZone.setAttribute('data-action', 'edit');
  nameZone.className = 'cip-token-name';
  nameZone.textContent = item.name;

  badge.append(iconZone, nameZone);
  return badge;
}

// ────────────────────────────────────────────────────────────────────────────
// Меню подсказок (@)
// ────────────────────────────────────────────────────────────────────────────

interface SuggestionMenuProps {
  models: InputAiModel[];
  members: InputTeamMember[];
  flat: FlatItem[];
  highlightedIndex: number;
  onHover: (index: number) => void;
  onSelect: (item: FlatItem) => void;
}

function SuggestionMenu({ models, members, flat, highlightedIndex, onHover, onSelect }: SuggestionMenuProps) {
  const noResults = flat.length === 0;

  return (
    <div onMouseDown={(e) => e.preventDefault()} className="cip-menu">
      <div className="cip-menu-scroll">
        {models.length > 0 && (
          <>
            <div className="cip-group-label">ИИ-модели</div>
            {models.map((m) => {
              const idx = flat.findIndex((f) => f.kind === 'model' && f.id === m.id);
              const active = idx === highlightedIndex;
              return (
                <button
                  key={m.id}
                  type="button"
                  onMouseEnter={() => onHover(idx)}
                  onClick={() => onSelect({ kind: 'model', ...m })}
                  className={`cip-menu-row${active ? ' cip-active' : ''}`}
                >
                  <m.Icon size={20} color="#fbbf24" style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="cip-row-name">{m.name}</span>
                    <span className="cip-row-sub">{m.desc}</span>
                  </span>
                  <span className="cip-row-count">
                    <span className={`cip-dot${m.count > 0 ? ' cip-on' : ''}`} />
                    {m.count}
                  </span>
                </button>
              );
            })}
          </>
        )}

        {members.length > 0 && (
          <>
            <div className="cip-group-label">Участники проекта</div>
            {members.map((p) => {
              const idx = flat.findIndex((f) => f.kind === 'member' && f.id === p.id);
              const active = idx === highlightedIndex;
              return (
                <button
                  key={p.id}
                  type="button"
                  onMouseEnter={() => onHover(idx)}
                  onClick={() => onSelect({ kind: 'member', ...p })}
                  className={`cip-menu-row${active ? ' cip-active' : ''}`}
                >
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 999,
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#fff',
                      background: p.colorHex,
                      flexShrink: 0,
                    }}
                  >
                    {p.initials}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="cip-row-name">{p.name}</span>
                    <span className="cip-row-sub">{p.role}</span>
                  </span>
                </button>
              );
            })}
          </>
        )}

        {noResults && <div className="cip-no-results">Ничего не найдено</div>}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Основной компонент ChatInput
// ────────────────────────────────────────────────────────────────────────────

export interface ChatInputProps {
  placeholder?: string;
  aiModels?: InputAiModel[];
  teamMembers?: InputTeamMember[];
  onMentionOpen?: () => void;
  onSend?: (payload: { text: string; modelTokens: string[]; memberTokens: string[] }) => void;
}

function ChatInput({
  placeholder = 'Message team, or type @ to summon AI...',
  aiModels = [],
  teamMembers = [],
  onMentionOpen,
  onSend,
}: ChatInputProps) {
  const inputRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const mentionRef = useRef<MentionAnchor>({ mode: 'none' });

  const [isEmpty, setIsEmpty] = useState(true);
  const [isMultiline, setIsMultiline] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [mentionActive, setMentionActive] = useState(false);
  // Все теги моделей/людей в тексте (не только последний) — нужно для логики кнопки отправки
  const [modelTokenNames, setModelTokenNames] = useState<string[]>([]);
  const [memberTokenNames, setMemberTokenNames] = useState<string[]>([]);

  const { models, members, flat } = useMemo(
    () => getFilteredLists(mentionQuery, aiModels, teamMembers),
    [mentionQuery, aiModels, teamMembers],
  );

  useEffect(() => {
    try {
      document.execCommand('defaultParagraphSeparator', false, 'br');
    } catch {
      // execCommand устарел и может отсутствовать — не критично
    }
  }, []);

  // Измеряем перенос строк на СКРЫТОМ клоне с ПОСТОЯННОЙ шириной (та же, что у
  // развёрнутой col-раскладки), а не на видимом поле — так решение не зависит от
  // того, в каком режиме мы сейчас находимся, и не может зациклиться.
  const measureMultiline = useCallback(() => {
    const editable = inputRef.current;
    const measure = measureRef.current;
    if (!editable || !measure) return;
    measure.innerHTML = editable.innerHTML;
    setIsMultiline(measure.scrollHeight > 44);
  }, []);

  const closeMenu = useCallback(() => {
    setShowMenu(false);
    setMentionQuery('');
    setHighlightedIndex(0);
    mentionRef.current = { mode: 'none' };
  }, []);

  const syncFromDom = useCallback(() => {
    const root = inputRef.current;
    if (!root) return;
    cleanupDom(root);
    const empty = isRootEmpty(root);
    setIsEmpty(empty);
    if (empty && root.innerHTML !== '') {
      root.innerHTML = '';
    }
    const models_: string[] = [];
    const members_: string[] = [];
    root.querySelectorAll<HTMLElement>('[data-token]').forEach((t) => {
      const name = t.dataset.name || '';
      if (t.dataset.token === 'model') models_.push(name);
      else members_.push(name);
    });
    setModelTokenNames(models_);
    setMemberTokenNames(members_);
  }, []);

  // ── Проверка "курсор сейчас в позиции @|" или "@query|" — используется и при вводе,
  // и при фокусе/клике, чтобы не заставлять стирать и вводить "@" заново. ───────────
  const detectAndOpenMention = useCallback((): boolean => {
    const root = inputRef.current;
    if (!root) return false;
    const { text, node, offset } = getTextBeforeCaret(root);
    const match = text.match(/(?:^|\s)@([^\s@]*)$/);
    if (!match || !node) return false;

    const query = match[1];
    const start = offset - query.length - 1;
    const alreadyLive = node.parentElement?.classList.contains('cip-mention-live');
    const currentLiveText = alreadyLive ? node.parentElement!.textContent : null;

    if (!alreadyLive || currentLiveText !== `@${query}`) {
      const r = document.createRange();
      r.setStart(node, Math.max(0, start));
      r.setEnd(node, offset);
      r.deleteContents();
      const span = document.createElement('span');
      span.className = 'cip-mention-live';
      span.textContent = `@${query}`;
      r.insertNode(span);
      const sel = window.getSelection();
      const nr = document.createRange();
      nr.selectNodeContents(span);
      nr.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(nr);
      mentionRef.current = { mode: 'range', node: span.firstChild as Text, start: 0, end: query.length + 1 };
    } else {
      mentionRef.current = { mode: 'range', node, start, end: offset };
    }

    setMentionQuery(query);
    setHighlightedIndex(0);
    setShowMenu(true);
    setMentionActive(true);
    onMentionOpen?.();
    return true;
  }, [onMentionOpen]);

  const insertOrReplaceToken = useCallback(
    (item: FlatItem) => {
      const root = inputRef.current;
      if (!root) return;
      const anchor = mentionRef.current;
      const badge = buildBadgeElement(item);

      if (anchor.mode === 'token') {
        anchor.tokenEl.replaceWith(badge);
        placeCaretAfter(badge);
      } else if (anchor.mode === 'range') {
        const { node, start, end } = anchor;
        const range = document.createRange();
        range.setStart(node, Math.max(0, Math.min(start, node.length)));
        range.setEnd(node, Math.max(0, Math.min(end, node.length)));
        range.deleteContents();
        range.insertNode(badge);
        const space = document.createTextNode('\u00A0');
        badge.after(space);
        placeCaretAfter(space);
      }

      root.focus();
      setMentionActive(false);
      closeMenu();
      syncFromDom();
      measureMultiline();
    },
    [closeMenu, syncFromDom, measureMultiline]
  );

  const handleRootClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      const removeZone = target.closest('[data-action="remove"]');
      const badgeEl = target.closest<HTMLElement>('[data-token]');

      if (!badgeEl) {
        // Клик мог попасть внутрь "@query" (например, после клика мимо меню раньше) —
        // тогда просто переоткрываем меню в этой позиции, без стирания "@" заново.
        const reopened = detectAndOpenMention();
        if (!reopened && showMenu) {
          const root = inputRef.current;
          if (root && mentionRef.current.mode === 'range') unwrapMentionLiveNode(root);
          setMentionActive(false);
          closeMenu();
        }
        return;
      }

      if (removeZone) {
        e.preventDefault();
        badgeEl.remove();
        if (showMenu) closeMenu();
        syncFromDom();
        measureMultiline();
        return;
      }

      // Клик по имени тега — открыть меню переназначения с подсветкой ТЕКУЩЕГО значения.
      e.preventDefault();
      const kind = badgeEl.dataset.token as 'model' | 'member';
      const id = badgeEl.dataset.id || '';
      mentionRef.current = { mode: 'token', tokenEl: badgeEl };
      setMentionQuery('');
      setHighlightedIndex(Math.max(0, getFullFlatIndex(kind, id, aiModels, teamMembers)));
      setShowMenu(true);
    },
    [showMenu, closeMenu, syncFromDom, measureMultiline, detectAndOpenMention, aiModels, teamMembers]
  );

  const handleBackspace = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const root = inputRef.current;
      if (!root) return false;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return false;
      const range = sel.getRangeAt(0);
      const { startContainer, startOffset } = range;

      let tokenToRemove: HTMLElement | null = null;

      if (startContainer.nodeType === Node.TEXT_NODE && startOffset === 0) {
        const prev = startContainer.previousSibling as HTMLElement | null;
        if (prev && prev.nodeType === Node.ELEMENT_NODE && prev.dataset?.token) {
          tokenToRemove = prev;
        }
      } else if (startContainer.nodeType === Node.ELEMENT_NODE) {
        const nodeBefore = startContainer.childNodes[startOffset - 1] as HTMLElement | undefined;
        if (nodeBefore && nodeBefore.nodeType === Node.ELEMENT_NODE && nodeBefore.dataset?.token) {
          tokenToRemove = nodeBefore;
        }
      }

      if (!tokenToRemove) return false;

      e.preventDefault();
      const prevSibling = tokenToRemove.previousSibling;
      tokenToRemove.remove();

      const newRange = document.createRange();
      if (prevSibling) {
        newRange.setStartAfter(prevSibling);
      } else {
        newRange.setStart(root, 0);
      }
      newRange.collapse(true);
      sel.removeAllRanges();
      sel.addRange(newRange);

      syncFromDom();
      measureMultiline();
      return true;
    },
    [syncFromDom, measureMultiline]
  );

  const handleInput = useCallback(() => {
    const root = inputRef.current;
    if (!root) return;

    syncFromDom();

    const { text, node } = getTextBeforeCaret(root);

    // 1) Полное совпадение имени + только что введённый пробел → автоматически ставим тег.
    const completedMatch = text.match(/(?:^|\s)@([^\s@]+)(\s)$/);
    if (completedMatch && node) {
      const typedName = completedMatch[1];
      const exact = findExactMatch(typedName, aiModels, teamMembers);
      if (exact) {
        let targetNode: Text = node;
        const liveSpan = node.parentElement?.classList.contains('cip-mention-live')
          ? (node.parentElement as HTMLElement)
          : null;
        if (liveSpan) {
          const plain = unwrapMentionLiveNode(root);
          if (plain) targetNode = plain;
        }
        const fullLen = 1 + typedName.length + 1;
        const nodeLen = targetNode.length;
        mentionRef.current = { mode: 'range', node: targetNode, start: nodeLen - fullLen, end: nodeLen };
        insertOrReplaceToken(exact);
        return;
      }
    }

    // 2) Открытый ввод "@query" — переиспользуем ту же проверку, что и для фокуса/клика
    const reopened = detectAndOpenMention();
    if (!reopened) {
      if (showMenu && mentionRef.current.mode === 'range') {
        // Имя не совпало ни с одной моделью/участником — снимаем подсветку.
        // ВАЖНО: replaceWith() иногда сбрасывает Selection у браузера, поэтому
        // каретку нужно восстановить вручную, иначе она "прыгает" к началу "@".
        const plain = unwrapMentionLiveNode(root);
        if (plain) placeCaretAtTextEnd(plain);
      }
      if (showMenu) closeMenu();
      setMentionActive(false);
    }

    measureMultiline();
  }, [closeMenu, insertOrReplaceToken, showMenu, syncFromDom, measureMultiline, detectAndOpenMention, aiModels, teamMembers]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Backspace') {
        const handled = handleBackspace(e);
        if (handled) return;
      }

      if (!showMenu) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, Math.max(flat.length - 1, 0)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = flat[highlightedIndex];
        if (item) insertOrReplaceToken(item);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        const root = inputRef.current;
        if (root && mentionRef.current.mode === 'range') unwrapMentionLiveNode(root);
        setMentionActive(false);
        closeMenu();
      }
    },
    [showMenu, flat, highlightedIndex, insertOrReplaceToken, closeMenu, handleBackspace]
  );

  const handleFocus = useCallback(() => {
    // Даём браузеру завершить установку каретки перед проверкой её позиции
    setTimeout(() => {
      detectAndOpenMention();
    }, 0);
  }, [detectAndOpenMention]);

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      const root = inputRef.current;
      if (root && mentionRef.current.mode === 'range') unwrapMentionLiveNode(root);
      setMentionActive(false);
      closeMenu();
      syncFromDom();
      measureMultiline();
    }, 120);
  }, [closeMenu, syncFromDom, measureMultiline]);

  const handleSend = useCallback(() => {
    const root = inputRef.current;
    if (!root) return;
    onSend?.({ text: root.textContent || '', modelTokens: modelTokenNames, memberTokens: memberTokenNames });
    root.innerHTML = '';
    setIsEmpty(true);
    setIsMultiline(false);
    setModelTokenNames([]);
    setMemberTokenNames([]);
    setMentionActive(false);
    closeMenu();
    root.blur();
  }, [onSend, modelTokenNames, memberTokenNames, closeMenu]);

  // ── Логика текста кнопки отправки по количеству ИИ-тегов в инпуте ──────────
  const sendConfig: SendConfig = useMemo(() => {
    if (modelTokenNames.length >= 2) return { label: 'Run Debate', icon: 'debate' };
    if (modelTokenNames.length === 1) return { label: `Ask ${modelTokenNames[0]}`, icon: 'model' };
    return { label: 'Send to All', icon: 'arrow' };
  }, [modelTokenNames]);

  const showSendCluster = !isEmpty && !showMenu;

  const rightControls = showSendCluster ? (
    <div className="cip-send-cluster">
      <button type="button" aria-label="Голосовой ввод" className="cip-icon-btn">
        <Mic size={18} />
      </button>
      <span className="cip-separator-dot" />
      <span className="cip-send-label">{sendConfig.label}</span>
      <button type="button" onClick={handleSend} aria-label={sendConfig.label} className="cip-icon-btn cip-send-btn">
        {sendConfig.icon === 'debate' && <Users size={16} />}
        {sendConfig.icon === 'model' && <Bot size={16} />}
        {sendConfig.icon === 'arrow' && <ArrowUp size={18} />}
      </button>
    </div>
  ) : (
    <button type="button" aria-label="Голосовой ввод" className="cip-icon-btn">
      <Mic size={18} />
    </button>
  );

  return (
    <div className="cip-root">
      <style>{CHAT_INPUT_STYLES}</style>

      {showMenu && (
        <SuggestionMenu
          models={models}
          members={members}
          flat={flat}
          highlightedIndex={highlightedIndex}
          onHover={setHighlightedIndex}
          onSelect={insertOrReplaceToken}
        />
      )}

      <div className={`cip-box ${isMultiline ? 'cip-col' : 'cip-row'}`}>
        {!isMultiline && (
          <button type="button" aria-label="Добавить вложение" className="cip-icon-btn">
            <Plus size={18} />
          </button>
        )}

        <div className="cip-editable-wrap">
          <div
            ref={inputRef}
            contentEditable
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label="Сообщение"
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onClick={handleRootClick}
            onFocus={handleFocus}
            onBlur={handleBlur}
            style={{ caretColor: mentionActive ? '#FFBC50' : '#EDEDED' }}
            className="cip-editable"
          />
          {isEmpty && <span className="cip-placeholder">{placeholder}</span>}
        </div>

        {!isMultiline && rightControls}

        {isMultiline && (
          <div className="cip-controls-row">
            <button type="button" aria-label="Добавить вложение" className="cip-icon-btn">
              <Plus size={18} />
            </button>
            {rightControls}
          </div>
        )}

        {/* Скрытый клон для устойчивого (без дрожания) измерения переноса строк */}
        <div ref={measureRef} className="cip-measure" aria-hidden="true" />
      </div>
    </div>
  );
}

export default ChatInput;
export { ChatInput };
