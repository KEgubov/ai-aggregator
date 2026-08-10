import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchChatMembers } from '../api/chat';
import { initialsFromName } from '../types/user';
import type { ChatMember } from '../types/chat';

const COLORS = {
  box: '#1f1f1f',
  border: '#424242',
  accent: '#F5A623',
  text: '#EDEDED',
  muted: '#949494',
  popoverBg: '#2D2D2D',
  separator: '#6b6b6b',
};

interface ChatMembersAvatarsProps {
  chatId: number;
  /** Username текущего пользователя — чтобы понять, владелец ли он. */
  currentUsername?: string;
  onOwnershipChange?: (isOwner: boolean) => void;
}

export default function ChatMembersAvatars({
  chatId,
  currentUsername,
  onOwnershipChange,
}: ChatMembersAvatarsProps) {
  const [members, setMembers] = useState<ChatMember[]>([]);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const onOwnershipChangeRef = useRef(onOwnershipChange);
  onOwnershipChangeRef.current = onOwnershipChange;

  useEffect(() => {
    let cancelled = false;
    setMembers([]);
    setOpenKey(null);
    onOwnershipChangeRef.current?.(false);

    void (async () => {
      try {
        const data = await fetchChatMembers(chatId);
        if (cancelled) return;
        setMembers(data);
        const me = currentUsername?.trim().toLowerCase() ?? '';
        const isOwner = Boolean(
          me &&
            data.some(
              (m) => m.is_owner && m.username.trim().toLowerCase() === me,
            ),
        );
        onOwnershipChangeRef.current?.(isOwner);
      } catch {
        if (!cancelled) {
          setMembers([]);
          onOwnershipChangeRef.current?.(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chatId, currentUsername]);

  useEffect(() => {
    if (openKey == null) return;

    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpenKey(null);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenKey(null);
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openKey]);

  const { owner, others } = useMemo(() => {
    const ownerMember = members.find((m) => m.is_owner) ?? members[0] ?? null;
    const rest = members.filter((m) => m !== ownerMember);
    return { owner: ownerMember, others: rest };
  }, [members]);

  if (!owner && others.length === 0) return null;

  function toggle(key: string) {
    setOpenKey((prev) => (prev === key ? null : key));
  }

  return (
    <div ref={rootRef} className="flex items-center gap-2.5 min-w-0 ml-2 sm:ml-3">
      {owner && (
        <MemberAvatar
          member={owner}
          zIndex={1}
          open={openKey === `owner:${owner.username}`}
          onToggle={() => toggle(`owner:${owner.username}`)}
        />
      )}

      {owner && (
        <span
          className="shrink-0 w-[3px] h-[3px] rounded-full"
          style={{ background: COLORS.separator }}
          aria-hidden
        />
      )}

      {others.length > 0 && (
        <div className="flex items-center">
          {others.map((member, index) => {
            const key = `member:${member.username}:${index}`;
            return (
              <div
                key={key}
                className={index === 0 ? undefined : '-ml-1.5'}
                style={{ zIndex: index + 2 }}
              >
                <MemberAvatar
                  member={member}
                  zIndex={index + 2}
                  open={openKey === key}
                  onToggle={() => toggle(key)}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface MemberAvatarProps {
  member: ChatMember;
  zIndex: number;
  open: boolean;
  onToggle: () => void;
}

function MemberAvatar({ member, zIndex, open, onToggle }: MemberAvatarProps) {
  const initials = initialsFromName(member.username);

  return (
    <div className="relative shrink-0" style={{ zIndex }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={member.username}
        className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-semibold select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
        style={{
          background: COLORS.box,
          color: COLORS.accent,
          border: `1px solid ${COLORS.border}`,
        }}
      >
        {initials}
      </button>

      {open && (
        <div
          role="dialog"
          className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+8px)] z-50 w-40 rounded-lg px-2.5 py-2 shadow-xl"
          style={{
            background: COLORS.popoverBg,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <p className="text-xs font-medium truncate" style={{ color: COLORS.text }}>
            {member.username}
            {member.is_owner ? ' · владелец' : ''}
          </p>
          <p className="text-[11px] mt-0.5 leading-snug break-words" style={{ color: COLORS.muted }}>
            {member.about_me?.trim() || 'Нет описания'}
          </p>
        </div>
      )}
    </div>
  );
}
