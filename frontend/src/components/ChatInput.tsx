'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
.cip-root {
  position: relative;
  width: 100%;
  max-width: 36rem;
  margin: 0 auto;
  animation: cip-rise-in 280ms cubic-bezier(0.32, 0.72, 0, 1) both;
}

.cip-box {
  position: relative;
  background: #2D2D2D;
  border: 1px solid #424242;
  border-radius: 24px;
  padding: 6px;
  overflow: hidden;
  transition:
    border-color 180ms cubic-bezier(0.32, 0.72, 0, 1),
    box-shadow 180ms cubic-bezier(0.32, 0.72, 0, 1),
    background-color 180ms ease;
}
.cip-box.cip-animating-height {
  /* Пока анимируем высоту — не даём контенту вылезать за рамку */
  overflow: hidden;
}
.cip-box.cip-row { min-height: 48px; display: flex; align-items: center; gap: 8px; }
.cip-box.cip-col { display: flex; flex-direction: column; gap: 6px; min-height: 48px; }
.cip-box:focus-within {
  border-color: #5a5a5a;
  box-shadow: 0 0 0 1px rgba(245, 166, 35, 0.22), 0 10px 28px rgba(0, 0, 0, 0.28);
}

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
  transition:
    background-color .15s ease,
    color .15s ease,
    transform .15s cubic-bezier(0.32, 0.72, 0, 1),
    opacity .15s ease;
  padding: 0;
}
.cip-icon-btn:hover { background: #424242; }
.cip-icon-btn:active { transform: scale(0.94); }

.cip-send-cluster {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  animation: cip-fade-scale-in 180ms cubic-bezier(0.32, 0.72, 0, 1) both;
}
.cip-separator-dot { width: 4px; height: 4px; border-radius: 999px; background: #2D2D2D; flex-shrink: 0; }
.cip-send-label {
  font-size: 14px;
  color: #C7C7C7;
  white-space: nowrap;
  max-width: 12rem;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color .15s ease;
}
.cip-send-btn {
  background: #F5A623;
  color: #1a1a1a;
  transition:
    background-color .15s ease,
    transform .15s cubic-bezier(0.32, 0.72, 0, 1),
    opacity .15s ease;
}
.cip-send-btn:hover { background: #ffb64a; }
.cip-send-btn:active:not(:disabled) { transform: scale(0.94); }
.cip-send-btn:disabled { opacity: 0.55; cursor: default; }

@media (max-width: 480px) {
  .cip-send-label,
  .cip-separator-dot { display: none; }
  .cip-menu { max-width: 100%; }
}

.cip-controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  animation: cip-fade-in 160ms ease both;
}

/* Привязанная модель — над полем ввода, живёт между отправками */
.cip-bound-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 4px 6px 0;
  animation: cip-bound-in 200ms cubic-bezier(0.32, 0.72, 0, 1) both;
}
.cip-bound-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 4px 2px 2px;
  border-radius: 8px;
  max-width: 100%;
  color: #FFBC50;
  font-size: 14px;
  line-height: 20px;
  transition: background-color .12s ease;
}
.cip-bound-tag:hover { background: rgba(255, 188, 80, 0.08); }
.cip-bound-tag-icon {
  position: relative;
  width: 16px;
  height: 16px;
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
  color: #FFBC50;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
}
.cip-bound-tag-icon-default { position: absolute; inset: 0; display: grid; place-items: center; transition: opacity .1s ease; }
.cip-bound-tag-icon-remove {
  position: absolute; inset: 0; display: grid; place-items: center; border-radius: 999px;
  background: #FF9D00; color: #191919; font-size: 10px; line-height: 1; opacity: 0;
  transition: opacity .1s ease;
}
.cip-bound-tag-icon-remove::before { content: '✕'; }
.cip-bound-tag-icon:hover .cip-bound-tag-icon-default { opacity: 0; }
.cip-bound-tag-icon:hover .cip-bound-tag-icon-remove { opacity: 1; }
.cip-bound-tag-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cip-editable-wrap { position: relative; display: grid; flex: 1; min-width: 0; }
.cip-editable, .cip-placeholder { grid-area: 1 / 1; }
.cip-editable {
  outline: none;
  font-size: 15px;
  line-height: 24px;
  color: #EDEDED;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  max-height: 160px;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 6px 2px;
  min-width: 0;
  /* Браузер не должен тащить жёлтый цвет тега в обычный набор */
  -webkit-text-fill-color: #EDEDED;
}
.cip-editable .cip-token-name,
.cip-editable .cip-mention-live {
  -webkit-text-fill-color: #FFBC50;
  color: #FFBC50;
}
.cip-editable [data-plain='1'] {
  -webkit-text-fill-color: #EDEDED;
  color: #EDEDED;
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
  transition: opacity .15s ease, color .15s ease;
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
  transform-origin: bottom left;
  animation: cip-menu-in 200ms cubic-bezier(0.32, 0.72, 0, 1) both;
}
.cip-menu-scroll {
  max-height: 290px;
  overflow-y: auto;
  padding: 6px 0;
  scrollbar-width: thin;
  scrollbar-color: #5a5a5a transparent;
}
.cip-menu-scroll::-webkit-scrollbar { width: 8px; }
.cip-menu-scroll::-webkit-scrollbar-track { background: transparent; }
.cip-menu-scroll::-webkit-scrollbar-thumb {
  background: #5a5a5a;
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: padding-box;
}
.cip-menu-scroll::-webkit-scrollbar-thumb:hover { background: #737373; }
.cip-menu-scroll::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
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
  transition: background-color .12s ease;
}
.cip-menu-row.cip-active { background: #3C3C3C; }
.cip-row-name { font-size: 14px; color: #EDEDED; display: block; }
.cip-row-sub { font-size: 12px; color: #949494; display: block; }
.cip-row-count { font-size: 12px; color: #949494; display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.cip-dot { width: 6px; height: 6px; border-radius: 999px; background: #6B6B6B; transition: background-color .15s ease; }
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
  animation: cip-fade-scale-in 160ms cubic-bezier(0.32, 0.72, 0, 1) both;
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
.cip-token-icon-remove::before { content: '✕'; }
.cip-token-icon:hover .cip-token-icon-remove { opacity: 1; }
.cip-token-name { color: #FFBC50; cursor: pointer; }

.cip-mention-live { color: #FFBC50; }

@keyframes cip-rise-in {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes cip-menu-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes cip-bound-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes cip-fade-scale-in {
  from {
    opacity: 0;
    transform: scale(0.92);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes cip-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .cip-root,
  .cip-menu,
  .cip-bound-row,
  .cip-send-cluster,
  .cip-controls-row,
  .cip-token {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  .cip-box,
  .cip-icon-btn,
  .cip-send-btn,
  .cip-send-label,
  .cip-placeholder,
  .cip-menu-row,
  .cip-bound-tag {
    transition: none !important;
  }
  .cip-box {
    height: auto !important;
  }
  .cip-icon-btn:active,
  .cip-send-btn:active:not(:disabled) {
    transform: none !important;
  }
}
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
  | { mode: 'bound' }
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
  const hasText = extractEditableText(root).trim().length > 0;
  const hasTokens = root.querySelector('[data-token]') !== null;
  return !hasText && !hasTokens;
}

/** Текст сообщения без UI-элементов тегов (@модель): иконка ✕ и имя тега не попадают в payload. */
function extractEditableText(root: HTMLElement): string {
  let text = '';
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? '';
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    if (el.dataset.token) return;
    for (const child of el.childNodes) walk(child);
  };
  for (const child of root.childNodes) walk(child);
  return text;
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
 * текста перед тегом, и гарантирует, что сразу после каждого тега есть носитель
 * обычного текста с явным цветом — иначе Chrome наследует жёлтый цвет тега.
 */
function ensurePlainCarrierAfter(tokenEl: HTMLElement): HTMLElement {
  const next = tokenEl.nextSibling;
  if (next instanceof HTMLElement && next.dataset.plain === '1') {
    next.style.color = '#EDEDED';
    if (!next.firstChild) {
      next.appendChild(document.createTextNode(''));
    }
    return next;
  }
  const carrier = document.createElement('span');
  carrier.dataset.plain = '1';
  carrier.style.color = '#EDEDED';
  if (next && next.nodeType === Node.TEXT_NODE) {
    carrier.appendChild(next);
  } else {
    carrier.appendChild(document.createTextNode('\u00A0'));
  }
  tokenEl.after(carrier);
  return carrier;
}

function placeCaretAfterToken(badge: HTMLElement) {
  const carrier = ensurePlainCarrierAfter(badge);
  const text = carrier.firstChild;
  if (text && text.nodeType === Node.TEXT_NODE) {
    placeCaretAtTextEnd(text as Text);
  } else {
    placeCaretAfter(carrier);
  }
}

/** Сбрасывает жёлтый/цветной стиль, который браузер «протекает» из тега в обычный текст. */
function normalizeLeakedColors(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>('font, span').forEach((el) => {
    if (el.closest('[data-token]')) return;
    if (el.classList.contains('cip-mention-live')) return;
    if (el.dataset.plain === '1') {
      el.style.color = '#EDEDED';
      el.removeAttribute('color');
      return;
    }
    if (el.style.color || el.getAttribute('color') || el.tagName === 'FONT') {
      el.style.color = '#EDEDED';
      el.removeAttribute('color');
    }
  });
}

function cleanupDom(root: HTMLElement) {
  root.querySelectorAll('div, p').forEach((el) => {
    if (!el.textContent?.trim() && el.querySelectorAll('[data-token]').length === 0) {
      el.remove();
    }
  });
  root.querySelectorAll<HTMLElement>('[data-token]').forEach((tokenEl) => {
    ensurePlainCarrierAfter(tokenEl);
  });
  normalizeLeakedColors(root);
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
  iconRemove.setAttribute('aria-hidden', 'true');

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
  const boxRef = useRef<HTMLDivElement>(null);
  const boxHeightRef = useRef<number | null>(null);
  const heightAnimGenRef = useRef(0);
  const mentionRef = useRef<MentionAnchor>({ mode: 'none' });

  const [isEmpty, setIsEmpty] = useState(true);
  const [isMultiline, setIsMultiline] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [mentionActive, setMentionActive] = useState(false);
  /** Модель, привязанная к окну ввода — остаётся после отправки, пока не удалят тег. */
  const [boundModel, setBoundModel] = useState<InputAiModel | null>(null);
  const [memberTokenNames, setMemberTokenNames] = useState<string[]>([]);

  const modelTokenNames = useMemo(
    () => (boundModel ? [boundModel.name] : []),
    [boundModel],
  );

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

  /** Плавная высота box при row↔col и при росте строк (FLIP: from → auto). */
  const animateBoxHeight = useCallback(() => {
    const el = boxRef.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.height = '';
      el.style.transition = '';
      el.classList.remove('cip-animating-height');
      boxHeightRef.current = el.getBoundingClientRect().height;
      return;
    }

    const from =
      el.style.height !== ''
        ? el.getBoundingClientRect().height
        : (boxHeightRef.current ?? el.getBoundingClientRect().height);

    el.style.transition = 'none';
    el.style.height = 'auto';
    const to = el.getBoundingClientRect().height;

    if (boxHeightRef.current == null) {
      boxHeightRef.current = to;
      el.style.height = '';
      el.style.transition = '';
      el.classList.remove('cip-animating-height');
      return;
    }

    if (Math.abs(from - to) < 0.5) {
      el.style.height = '';
      el.style.transition = '';
      el.classList.remove('cip-animating-height');
      boxHeightRef.current = to;
      return;
    }

    el.style.height = `${from}px`;
    el.classList.add('cip-animating-height');
    void el.offsetHeight;

    const gen = ++heightAnimGenRef.current;
    el.style.transition = 'height 220ms cubic-bezier(0.32, 0.72, 0, 1)';
    el.style.height = `${to}px`;
    boxHeightRef.current = to;

    const onEnd = (event: TransitionEvent) => {
      if (event.target !== el || event.propertyName !== 'height') return;
      if (gen !== heightAnimGenRef.current) return;
      el.style.height = '';
      el.style.transition = '';
      el.classList.remove('cip-animating-height');
      boxHeightRef.current = el.getBoundingClientRect().height;
      el.removeEventListener('transitionend', onEnd);
    };
    el.addEventListener('transitionend', onEnd);
  }, []);

  // Развёрнутая (col) раскладка: при любом контенте — иначе боковые кнопки в row
  // сжимают поле, текст переносится, а фиксированная высота даёт вылет наружу.
  // Дополнительно смотрим скрытый клон на случай, если контент выше одной строки
  // уже на полной ширине (токен + текст).
  const measureMultiline = useCallback(() => {
    const editable = inputRef.current;
    const measure = measureRef.current;
    if (!editable || !measure) return;
    measure.innerHTML = editable.innerHTML;
    const hasContent = !isRootEmpty(editable);
    const wrapsAtFullWidth = measure.scrollHeight > 44;
    setIsMultiline(hasContent || wrapsAtFullWidth);
    requestAnimationFrame(() => {
      animateBoxHeight();
    });
  }, [animateBoxHeight]);

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
    // Инлайн-теги моделей больше не используем — убираем, если остались.
    root.querySelectorAll<HTMLElement>('[data-token="model"]').forEach((el) => el.remove());
    const empty = isRootEmpty(root);
    setIsEmpty(empty);
    if (empty && root.innerHTML !== '') {
      root.innerHTML = '';
    }
    const members_: string[] = [];
    root.querySelectorAll<HTMLElement>('[data-token="member"]').forEach((t) => {
      members_.push(t.dataset.name || '');
    });
    setMemberTokenNames(members_);
  }, []);

  /** Удаляет @query / live-mention из editable, оставляя каретку на месте. */
  const clearMentionFromEditable = useCallback(() => {
    const root = inputRef.current;
    if (!root) return;
    const anchor = mentionRef.current;

    if (anchor.mode === 'range') {
      const { node, start, end } = anchor;
      const liveSpan = node.parentElement?.classList.contains('cip-mention-live')
        ? node.parentElement
        : null;
      if (liveSpan) {
        const spacer = document.createTextNode('');
        liveSpan.replaceWith(spacer);
        placeCaretAtTextEnd(spacer);
      } else if (node) {
        const range = document.createRange();
        range.setStart(node, Math.max(0, Math.min(start, node.length)));
        range.setEnd(node, Math.max(0, Math.min(end, node.length)));
        range.deleteContents();
        range.collapse(true);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }

    while (root.querySelector('.cip-mention-live')) {
      unwrapMentionLiveNode(root);
    }
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

      // Модель привязывается к окну ввода, а не вставляется в текст.
      if (item.kind === 'model') {
        clearMentionFromEditable();
        setBoundModel({
          id: item.id,
          name: item.name,
          desc: item.desc,
          count: item.count,
          Icon: item.Icon,
        });
        root.focus();
        setMentionActive(false);
        closeMenu();
        syncFromDom();
        measureMultiline();
        return;
      }

      const anchor = mentionRef.current;
      const badge = buildBadgeElement(item);

      if (anchor.mode === 'token') {
        anchor.tokenEl.replaceWith(badge);
        placeCaretAfterToken(badge);
      } else if (anchor.mode === 'range') {
        const { node, start, end } = anchor;
        const liveSpan = node.parentElement?.classList.contains('cip-mention-live')
          ? node.parentElement
          : null;
        if (liveSpan) {
          liveSpan.replaceWith(badge);
        } else {
          const range = document.createRange();
          range.setStart(node, Math.max(0, Math.min(start, node.length)));
          range.setEnd(node, Math.max(0, Math.min(end, node.length)));
          range.deleteContents();
          range.insertNode(badge);
        }
        placeCaretAfterToken(badge);
      }

      root.focus();
      setMentionActive(false);
      closeMenu();
      syncFromDom();
      measureMultiline();
    },
    [closeMenu, syncFromDom, measureMultiline, clearMentionFromEditable]
  );

  const removeBoundModel = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setBoundModel(null);
    if (showMenu) closeMenu();
  }, [showMenu, closeMenu]);

  const openBoundModelMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (!boundModel) return;
      mentionRef.current = { mode: 'bound' };
      setMentionQuery('');
      setHighlightedIndex(Math.max(0, getFullFlatIndex('model', boundModel.id, aiModels, teamMembers)));
      setShowMenu(true);
      onMentionOpen?.();
    },
    [boundModel, aiModels, teamMembers, onMentionOpen],
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

  const handleSend = useCallback(() => {
    const root = inputRef.current;
    if (!root) return;
    cleanupDom(root);
    while (root.querySelector('.cip-mention-live')) {
      unwrapMentionLiveNode(root);
    }
    const text = extractEditableText(root);
    onSend?.({ text, modelTokens: modelTokenNames, memberTokens: memberTokenNames });
    // Текст очищаем, привязанную модель оставляем.
    root.innerHTML = '';
    setIsEmpty(true);
    setIsMultiline(false);
    setMemberTokenNames([]);
    setMentionActive(false);
    closeMenu();
    root.blur();
    requestAnimationFrame(() => {
      animateBoxHeight();
    });
  }, [onSend, modelTokenNames, memberTokenNames, closeMenu, animateBoxHeight]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Backspace') {
        const handled = handleBackspace(e);
        if (handled) return;
      }

      if (showMenu) {
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
        return;
      }

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!isEmpty) handleSend();
      }
    },
    [showMenu, flat, highlightedIndex, insertOrReplaceToken, closeMenu, handleBackspace, isEmpty, handleSend]
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

  // ── Логика текста кнопки отправки по количеству ИИ-тегов в инпуте ──────────
  const sendConfig: SendConfig = useMemo(() => {
    if (modelTokenNames.length >= 2) return { label: 'Run Debate', icon: 'debate' };
    if (modelTokenNames.length === 1) return { label: `Ask ${modelTokenNames[0]}`, icon: 'model' };
    return { label: 'Send to All', icon: 'arrow' };
  }, [modelTokenNames]);

  const hasBoundModel = boundModel !== null;
  const showSendCluster = (!isEmpty || hasBoundModel) && !showMenu;
  // Привязанная модель всегда держит col-раскладку (тег сверху, как на макете)
  const expanded = isMultiline || !isEmpty || hasBoundModel;

  useLayoutEffect(() => {
    animateBoxHeight();
  }, [expanded, hasBoundModel, animateBoxHeight]);

  const effectivePlaceholder = hasBoundModel
    ? `Ask ${boundModel.name}`
    : placeholder;

  const rightControls = showSendCluster ? (
    <div className="cip-send-cluster">
      <button type="button" aria-label="Голосовой ввод" className="cip-icon-btn">
        <Mic size={18} />
      </button>
      <span className="cip-separator-dot" />
      <span className="cip-send-label">{sendConfig.label}</span>
      <button
        type="button"
        onClick={handleSend}
        disabled={isEmpty}
        aria-label={sendConfig.label}
        className="cip-icon-btn cip-send-btn"
      >
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

      <div
        ref={boxRef}
        className={`cip-box ${expanded ? 'cip-col' : 'cip-row'}`}
      >
        {hasBoundModel && (
          <div className="cip-bound-row">
            <div className="cip-bound-tag">
              <button
                type="button"
                className="cip-bound-tag-icon"
                aria-label={`Удалить модель ${boundModel.name}`}
                onClick={removeBoundModel}
              >
                <span className="cip-bound-tag-icon-default" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                </span>
                <span className="cip-bound-tag-icon-remove" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="cip-bound-tag-name"
                onClick={openBoundModelMenu}
                aria-label={`Модель ${boundModel.name}. Нажмите, чтобы сменить`}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  color: 'inherit',
                  font: 'inherit',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {boundModel.name}
              </button>
            </div>
          </div>
        )}

        {!expanded && (
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
          {isEmpty && <span className="cip-placeholder">{effectivePlaceholder}</span>}
        </div>

        {!expanded && rightControls}

        {expanded && (
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
