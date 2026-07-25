import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronRight, Users, Pencil, Check, BellOff, Bell, Pin, PinOff,
  Archive, ArchiveRestore, LogOut, Trash2, Hash, Eye, MessageSquareText, Shield,
} from '@/lib/icons';
import { cn } from '@/lib/utils';
import {
  useChatMembers, useChatMutations,
  isAdmin as roleIsAdmin, isChatPinned, isChatArchived, isChatMuted,
  type ChatSummary,
} from '@/lib/chat';
import GroupAvatar from './GroupAvatar';
import RoleBadge from './RoleBadge';

interface GroupInfoSheetProps {
  isOpen: boolean;
  chat: ChatSummary;
  onClose: () => void;
  onOpenMembers: () => void;
  onLeft: () => void;
  onDeleted?: () => void;
  /** Caller user id — reserved for future "you" markers in the member preview row. */
  myUserId: string;
}

const MAX_TITLE_LEN = 120;
const MAX_DESC_LEN  = 240;

/**
 * Profile sheet for a group / channel chat. Mirrors the Telegram "info"
 * surface but uses the same plain-motion overlay pattern as the other
 * group sheets so it layers cleanly above the chat drawer.
 *
 * Sections (in order):
 *   1. Avatar + title + member count + role badge
 *   2. Editable title / description (admins only)
 *   3. Mute / pin / archive toggles for the caller
 *   4. Members entry-point row + members preview avatars
 *   5. Permissions block (admins only): who-can-send / who-can-add-members
 *   6. Danger zone: leave chat (everyone) + delete chat (owner only)
 */
const GroupInfoSheet: React.FC<GroupInfoSheetProps> = ({ isOpen, chat, onClose, onOpenMembers, onLeft, onDeleted,
  myUserId: _myUserId,
}) => {
  const BackIcon = ChevronRight;
  const muts = useChatMutations(chat.id);
  const { members } = useChatMembers(isOpen ? chat.id : null);

  const isOwner = chat.myRole === 'owner';
  const canEdit = roleIsAdmin({ role: chat.myRole });

  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc,  setEditingDesc]  = useState(false);
  const [draftTitle, setDraftTitle] = useState(chat.title ?? '');
  const [draftDesc,  setDraftDesc]  = useState(chat.description ?? '');

  // Re-sync local edit drafts when the sheet opens or the chat changes.
  useEffect(() => {
    if (isOpen) {
      setDraftTitle(chat.title ?? '');
      setDraftDesc(chat.description ?? '');
      setEditingTitle(false);
      setEditingDesc(false);
    }
  }, [isOpen, chat.id, chat.title, chat.description]);

  const close = useCallback(() => { onClose(); }, [onClose]);

  const saveTitle = useCallback(async () => {
    setEditingTitle(false);
    if (draftTitle.trim() === (chat.title ?? '').trim()) return;
    await muts.updateMetadata({ chatId: chat.id, title: draftTitle.trim() || null });
  }, [chat.id, chat.title, draftTitle, muts]);

  const saveDesc = useCallback(async () => {
    setEditingDesc(false);
    if (draftDesc.trim() === (chat.description ?? '').trim()) return;
    await muts.updateMetadata({ chatId: chat.id, description: draftDesc.trim() || null });
  }, [chat.id, chat.description, draftDesc, muts]);

  const muted = isChatMuted(chat);
  const pinned = isChatPinned(chat);
  const archived = isChatArchived(chat);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 z-nested bg-black/45 backdrop-blur-sm"
        onClick={close}
      />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className="absolute inset-x-0 bottom-0 z-nested-above bg-background rounded-t-3xl flex flex-col max-h-[92%] "
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mx-auto w-10 h-1 rounded-full bg-border/40 mt-2 mb-1" />

        <div className="px-4 h-14 flex items-center gap-2 border-b border-border/15">
          <button
            type="button"
            onClick={close}
            className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40"
            aria-label={'إغلاق'}
          >
            <BackIcon className="w-5 h-5 text-foreground" />
          </button>
          <h2 className="text-[16px] font-semibold flex-1 truncate">
            {chat.kind === 'channel'
              ? ('معلومات القناة')
              : ('معلومات المجموعة')}
          </h2>
          <button
            type="button"
            onClick={close}
            className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40"
            aria-label={'إغلاق'}
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Hero block */}
          <div className="flex flex-col items-center gap-2 pt-5 pb-4 px-4">
            <GroupAvatar chat={chat} className="h-24 w-24" showKindBadge />
            {editingTitle && canEdit ? (
              <div className="w-full max-w-sm">
                <input
                  autoFocus
                  type="text"
                  value={draftTitle}
                  onChange={e => setDraftTitle(e.target.value.slice(0, MAX_TITLE_LEN))}
                  onBlur={saveTitle}
                  onKeyDown={e => { if (e.key === 'Enter') saveTitle(); }}
                  className="w-full bg-muted/30 rounded-2xl px-4 h-11 text-[16px] font-semibold text-center outline-none focus:ring-2 focus:ring-primary/30"
                  dir="auto"
                />
              </div>
            ) : (
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => canEdit && setEditingTitle(true)}
                className={cn(
                  'flex items-center gap-1.5',
                  canEdit && 'active:opacity-80',
                )}
              >
                <h1 className="text-[20px] font-bold text-foreground">
                  {chat.title || ('بدون اسم')}
                </h1>
                {canEdit && <Pencil className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>
            )}
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
              {chat.kind === 'channel'
                ? <Hash className="w-3 h-3" />
                : <Users className="w-3 h-3" />}
              <span>
                {`${chat.memberCount} ${chat.memberCount === 1 ? 'عضو' : 'أعضاء'}`}
              </span>
              <span className="text-border/60">·</span>
              <RoleBadge role={chat.myRole} />
            </div>
          </div>

          {/* Description */}
          <Section>
            {editingDesc && canEdit ? (
              <textarea
                autoFocus
                value={draftDesc}
                onChange={e => setDraftDesc(e.target.value.slice(0, MAX_DESC_LEN))}
                onBlur={saveDesc}
                rows={3}
                className="w-full bg-muted/30 rounded-2xl px-4 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                dir="auto"
                placeholder={'وصف المجموعة'}
              />
            ) : (
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => canEdit && setEditingDesc(true)}
                className={cn(
                  'w-full flex items-start gap-3 px-4 py-3 text-start active:bg-accent/40 rounded-2xl bg-muted/15 border border-border/10',
                  !canEdit && !chat.description && 'opacity-60',
                )}
              >
                <MessageSquareText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted-foreground mb-0.5">
                    {'الوصف'}
                  </p>
                  <p className="text-[14px] text-foreground/90 leading-relaxed" dir="auto">
                    {chat.description || ('لا يوجد وصف')}
                  </p>
                </div>
                {canEdit && <Pencil className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1" />}
              </button>
            )}
          </Section>

          {/* Per-caller toggles */}
          <Section>
            <div className="rounded-2xl bg-muted/15 border border-border/10 divide-y divide-border/10">
              <ToggleRow
                icon={muted ? <BellOff className="w-4 h-4 text-muted-foreground" /> : <Bell className="w-4 h-4 text-foreground" />}
                label={'كتم الإشعارات'}
                value={muted}
                onChange={(v) => muts.setMuted(chat.id, v ? -1 : 0)}
              />
              <ToggleRow
                icon={pinned ? <PinOff className="w-4 h-4 text-muted-foreground" /> : <Pin className="w-4 h-4 text-foreground" />}
                label={'تثبيت في الأعلى'}
                value={pinned}
                onChange={(v) => muts.setPinned(chat.id, v)}
              />
              <ToggleRow
                icon={archived ? <ArchiveRestore className="w-4 h-4 text-muted-foreground" /> : <Archive className="w-4 h-4 text-foreground" />}
                label={'الأرشفة'}
                value={archived}
                onChange={(v) => muts.setArchived(chat.id, v)}
              />
            </div>
          </Section>

          {/* Members entry-point */}
          <Section>
            <button
              type="button"
              onClick={onOpenMembers}
              className="w-full rounded-2xl bg-muted/15 border border-border/10 flex items-center gap-3 px-4 py-3 active:bg-accent/40 transition-colors"
            >
              <Users className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1 min-w-0 text-start">
                <p className="text-[11px] text-muted-foreground">
                  {'الأعضاء'}
                </p>
                <p className="text-[14px] font-semibold text-foreground">
                  {`عرض كل الأعضاء (${chat.memberCount})`}
                </p>
              </div>
              <BackIcon className="w-4 h-4 text-muted-foreground rotate-180 rtl:rotate-0" />
            </button>
            {/* Tiny avatar preview row */}
            {members.length > 0 && (
              <div className="flex items-center -space-x-2 rtl:space-x-reverse mt-2 px-2">
                {members.slice(0, 6).map(m => (
                  <div
                    key={m.userId}
                    className="h-8 w-8 rounded-full ring-2 ring-background overflow-hidden bg-muted"
                  >
                    {m.avatarUrl?.startsWith('http') ? (
                      <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                ))}
                {members.length > 6 && (
                  <div className="h-8 w-8 rounded-full ring-2 ring-background bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                    +{members.length - 6}
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* Permissions */}
          {canEdit && chat.kind !== 'dm' && (
            <Section title={'الصلاحيات'}>
              <div className="rounded-2xl bg-muted/15 border border-border/10 divide-y divide-border/10">
                <PermissionRow
                  icon={<MessageSquareText className="w-4 h-4 text-muted-foreground" />}
                  label={'الإرسال'}
                  value={chat.whoCanSend === 'all'
                    ? ('الكل')
                    : ('المشرفون فقط')}
                  onClick={() => muts.updatePermissions({
                    chatId: chat.id,
                    whoCanSend: chat.whoCanSend === 'all' ? 'admins' : 'all',
                  })}
                />
                <PermissionRow
                  icon={<Eye className="w-4 h-4 text-muted-foreground" />}
                  label={'القناة عامة'}
                  value={chat.isPublic ? ('نعم') : ('لا')}
                  onClick={() => { /* future: toggle isPublic */ }}
                />
              </div>
            </Section>
          )}

          {/* Danger zone */}
          <Section>
            <div className="rounded-2xl bg-destructive/5 border border-destructive/15 divide-y divide-destructive/10">
              <DangerRow
                icon={<LogOut className="w-4 h-4" />}
                label={chat.kind === 'channel'
                  ? ('مغادرة القناة')
                  : ('مغادرة المجموعة')}
                onClick={async () => { await muts.leaveChat(chat.id); onLeft(); }}
              />
              {isOwner && (
                <DangerRow
                  icon={<Trash2 className="w-4 h-4" />}
                  label={chat.kind === 'channel'
                    ? ('حذف القناة')
                    : ('حذف المجموعة')}
                  onClick={() => { onDeleted?.(); }}
                />
              )}
            </div>
            <p className="text-[10px] text-muted-foreground/70 px-2 mt-2 leading-relaxed">
              <Shield className="inline w-3 h-3 me-1 -mt-0.5" />
              {'الحذف نهائي ولا يمكن التراجع عنه. الأعضاء سيفقدون كل الرسائل.'}
            </p>
          </Section>

          <div className="h-6" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

interface SectionProps { title?: string; children: React.ReactNode }
function Section({ title, children }: SectionProps) {
  return (
    <div className="px-4 mt-3">
      {title && <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground/70 px-1 mb-1.5">{title}</h3>}
      {children}
    </div>
  );
}

interface ToggleRowProps { icon: React.ReactNode; label: string; value: boolean; onChange: (next: boolean) => void }
function ToggleRow({ icon, label, value, onChange }: ToggleRowProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="w-full flex items-center gap-3 px-4 py-3 active:bg-accent/30 text-start"
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 text-[14px] text-foreground">{label}</span>
      <span className={cn(
        'w-9 h-5 rounded-full transition-colors relative shrink-0',
        value ? 'bg-primary' : 'bg-muted',
      )}>
        <span className={cn(
          'absolute top-0.5 h-4 w-4 rounded-full bg-background transition-all',
          value ? 'start-[18px]' : 'start-0.5',
        )} />
      </span>
    </button>
  );
}

interface PermissionRowProps { icon: React.ReactNode; label: string; value: string; onClick: () => void }
function PermissionRow({ icon, label, value, onClick }: PermissionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 active:bg-accent/30 text-start"
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 text-[14px] text-foreground">{label}</span>
      <span className="text-[12px] text-muted-foreground">{value}</span>
    </button>
  );
}

interface DangerRowProps { icon: React.ReactNode; label: string; onClick: () => void }
function DangerRow({ icon, label, onClick }: DangerRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 active:bg-destructive/10 text-destructive text-start"
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 text-[14px] font-medium">{label}</span>
      <Check className="w-3 h-3 opacity-0" /> {/* keeps row height aligned with toggle row */}
    </button>
  );
}

export default GroupInfoSheet;
