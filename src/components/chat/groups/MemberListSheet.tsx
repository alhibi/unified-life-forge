import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronRight, UserPlus, MoreHorizontal, Shield,
  ShieldOff, UserMinus, AlertTriangle,
} from '@/lib/icons';
import { cn } from '@/lib/utils';
import {
  useChatMembers, useChatMutations,
  type ChatMember, type ChatRole, type ChatSummary,
} from '@/lib/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { isEmojiAvatarValue, getAppleEmojiUrl } from '@/utils/emojiAvatar';
import { getDefaultAvatarForUser } from '@/utils/defaultAvatar';
import RoleBadge from './RoleBadge';
import MemberPicker from './MemberPicker';

interface MemberListSheetProps {
  isOpen: boolean;
  chat: ChatSummary;
  onClose: () => void;
  /** Caller user id — drives "you can promote/demote/remove" gating. */
  myUserId: string;
}

type View = 'list' | 'add';

/**
 * Member list / management sheet for groups + channels.
 * Owner / admin actions:
 *   • Add members
 *   • Promote member → admin (and back)
 *   • Remove member
 *
 * Admins cannot remove other admins (ownership transfer is a separate
 * flow we'll add in a later wave). The owner is never demotable / removable.
 */
const MemberListSheet: React.FC<MemberListSheetProps> = ({ isOpen, chat, onClose, myUserId,
}) => {
  const BackIcon = ChevronRight;
  const [view, setView] = useState<View>('list');
  const [confirm, setConfirm] = useState<{ kind: 'remove' | 'demote' | 'promote'; member: ChatMember } | null>(null);

  const { members, isLoading } = useChatMembers(chat.id);
  const muts = useChatMutations(chat.id);

  const myRole: ChatRole = chat.myRole;

  const close = useCallback(() => { onClose(); setView('list'); setConfirm(null); }, [onClose]);

  const canManage = myRole === 'owner' || myRole === 'admin';

  const onPromote = (m: ChatMember) =>
    void muts.changeMemberRole(chat.id, m.userId, 'admin');
  const onDemote  = (m: ChatMember) =>
    void muts.changeMemberRole(chat.id, m.userId, 'member');
  const onRemove  = (m: ChatMember) =>
    void muts.removeMember(chat.id, m.userId);
  const onAdd     = (ids: string[]) =>
    Promise.all(ids.map(id => muts.addMember(chat.id, id))).then(() => setView('list'));

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
 className="absolute inset-x-0 bottom-0 z-nested-above bg-background rounded-t-3xl flex flex-col max-h-[92%]"
 onClick={e => e.stopPropagation()}
 role="dialog"
 aria-modal="true"
 >
 <div className="mx-auto w-10 h-1 rounded-full bg-border/40 mt-2 mb-1" />

 <div className="px-4 h-14 flex items-center gap-2 border-b border-border/15">
 <button
 type="button"
 onClick={() => view === 'add' ? setView('list') : close()}
            className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40"
            aria-label={'رجوع'}
          >
            <BackIcon className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-[16px] font-semibold truncate">
              {view === 'add'
                ? ('إضافة أعضاء')
                : ('الأعضاء')}
            </h2>
            {view === 'list' && (
              <p className="text-[11px] text-muted-foreground">
                {`${members.length} عضواً`}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={close}
            className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40"
            aria-label={'إغلاق'}
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {view === 'list' ? (
          <div className="flex-1 overflow-y-auto">
            {canManage && (
              <button
                type="button"
                onClick={() => setView('add')}
                className="w-full flex items-center gap-3 px-4 py-3 active:bg-accent/40 transition-colors text-start"
              >
                <div className="h-10 w-10 rounded-full bg-primary/12 flex items-center justify-center text-primary">
                  <UserPlus className="w-5 h-5" />
                </div>
                <span className="text-[14px] font-semibold text-primary">
                  {'إضافة عضو'}
                </span>
              </button>
            )}

            {isLoading && (
              <div className="space-y-1 px-4 py-2">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <div className="skeleton h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <div className="skeleton h-3 w-28 rounded" />
                      <div className="skeleton h-2.5 w-16 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isLoading && members.length > 0 && (
              <div className="divide-y divide-border/10">
                {members.map(m => (
                  <MemberRow
                    key={m.userId}
                    member={m}
                    isMe={m.userId === myUserId}
                    canManage={canManage}
                    callerRole={myRole}
                    onPromote={() => setConfirm({ kind: 'promote', member: m })}
                    onDemote={() => setConfirm({ kind: 'demote', member: m })}
                    onRemove={() => setConfirm({ kind: 'remove',  member: m })}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 min-h-0 px-4 py-3 flex flex-col">
            <MemberPicker
              selectedIds={[]}
              excludeIds={members.map(m => m.userId)}
              onChange={(ids) => { if (ids.length > 0) void onAdd(ids); }}
            />
          </div>
        )}

        {/* Confirm dialog overlay */}
        <AnimatePresence>
          {confirm && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-deep bg-black/55"
                onClick={() => setConfirm(null)}
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: 'spring', damping: 26, stiffness: 320 }}
 className="absolute inset-x-6 top-1/3 z-deep-above bg-background rounded-3xl p-5"
 >
 <div className="flex items-start gap-3 mb-3">
 <div className={cn(
 'h-10 w-10 rounded-full flex items-center justify-center shrink-0',
                    confirm.kind === 'remove' ? 'bg-destructive/15 text-destructive' : 'bg-primary/15 text-primary',
                  )}>
                    {confirm.kind === 'remove' ? <AlertTriangle className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[15px] font-semibold mb-1">
                      {confirm.kind === 'remove'
                        ? ('إزالة العضو؟')
                        : confirm.kind === 'promote'
                          ? ('ترقية إلى مشرف؟')
                          : ('إلغاء صلاحيات الإشراف؟')}
                    </h3>
                    <p className="text-[13px] text-muted-foreground">
                      {confirm.member.displayName || confirm.member.username || confirm.member.userId.slice(0, 6)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setConfirm(null)}
                    className="flex-1 h-11 rounded-xl bg-muted/30 text-foreground text-[14px] font-medium active:scale-[0.98]"
                  >
                    {'إلغاء'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm.kind === 'remove')  onRemove(confirm.member);
                      if (confirm.kind === 'promote') onPromote(confirm.member);
                      if (confirm.kind === 'demote')  onDemote(confirm.member);
                      setConfirm(null);
                    }}
                    className={cn(
                      'flex-1 h-11 rounded-xl text-[14px] font-semibold active:scale-[0.98]',
                      confirm.kind === 'remove'
                        ? 'bg-destructive text-destructive-foreground'
                        : 'bg-primary text-primary-foreground',
                    )}
                  >
                    {confirm.kind === 'remove'
                      ? ('إزالة')
                      : ('تأكيد')}
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};

interface MemberRowProps {
  member: ChatMember;
  isMe: boolean;
  canManage: boolean;
  callerRole: ChatRole;
  onPromote: () => void;
  onDemote: () => void;
  onRemove: () => void;
}

function MemberRow({ member, isMe, canManage, callerRole, onPromote, onDemote, onRemove }: MemberRowProps) {
  const [open, setOpen] = useState(false);
  const isOwner = member.role === 'owner';
  const isAdmin = member.role === 'admin';
  // Caller cannot manage themselves, the owner, or another admin (when caller is admin too).
  const canActOnThis = canManage && !isMe && !isOwner && !(callerRole === 'admin' && isAdmin);

  const isEmoji = member.avatarUrl ? isEmojiAvatarValue(member.avatarUrl) : false;
  const hasImage = member.avatarUrl && member.avatarUrl.startsWith('http');

  return (
    <div className="relative flex items-center gap-3 px-4 py-2.5">
      <Avatar className="h-10 w-10 shrink-0">
        {hasImage ? (
          <AvatarImage src={member.avatarUrl!} className="object-cover" />
        ) : isEmoji ? (
          <AvatarImage
            src={getAppleEmojiUrl(member.avatarUrl!) || ''}
            className="w-[60%] h-[60%] object-contain m-auto"
          />
        ) : (
          <img
            src={getDefaultAvatarForUser(member.username || member.userId)}
            alt=""
            className="w-full h-full object-cover"
          />
        )}
        <AvatarFallback className="bg-muted" />
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[14px] font-semibold text-foreground truncate">
            {member.displayName || member.username || member.userId.slice(0, 6)}
            {isMe && <span className="ms-1 text-[11px] font-medium text-muted-foreground">{'(أنت)'}</span>}
          </span>
          <RoleBadge role={member.role} customTitle={member.customTitle} />
        </div>
        {member.username && member.displayName && member.displayName !== member.username && (
          <p className="text-[11px] text-muted-foreground truncate">@{member.username}</p>
        )}
      </div>

      {canActOnThis && (
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40"
          aria-label={'إجراءات'}
 >
 <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
 </button>
 )}

 {/* Inline action menu (no portal — keeps the sheet self-contained). */}
 {open && (
 <div
 className="absolute end-3 top-12 z-raised min-w-[180px] bg-popover border border-border/30 rounded-xl py-1 overflow-hidden"
 onClick={() => setOpen(false)}
 >
 {member.role === 'member' ? (
            <RowAction
              icon={<Shield className="w-4 h-4" />}
              label={'ترقية إلى مشرف'}
              onClick={onPromote}
            />
          ) : (
            <RowAction
              icon={<ShieldOff className="w-4 h-4" />}
              label={'إلغاء صلاحيات الإشراف'}
              onClick={onDemote}
            />
          )}
          <RowAction
            icon={<UserMinus className="w-4 h-4 text-destructive" />}
            label={'إزالة من المجموعة'}
            onClick={onRemove}
            danger
          />
        </div>
      )}
    </div>
  );
}

interface RowActionProps { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }
function RowAction({ icon, label, onClick, danger }: RowActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-3 h-10 text-start text-[13px] active:bg-accent/40',
        danger ? 'text-destructive' : 'text-foreground',
      )}
    >
      {icon}{label}
    </button>
  );
}

export default MemberListSheet;
