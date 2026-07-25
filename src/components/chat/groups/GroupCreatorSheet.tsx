import React, { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Camera, ChevronRight, Users, Hash, ArrowLeft,
} from '@/lib/icons';
import { cn } from '@/lib/utils';
import { useChatMutations, useUserSearch, type UserSearchResult, type ChatSummary } from '@/lib/chat';
import GroupAvatar from './GroupAvatar';
import MemberPicker from './MemberPicker';

interface GroupCreatorSheetProps {
  isAr: boolean;
  isOpen: boolean;
  onClose: () => void;
  onCreated: (chat: ChatSummary) => void;
  /** Initial kind. The user can switch via the chip at the top. */
  initialKind?: 'group' | 'channel';
}

type Step = 'pick-members' | 'fill-meta';

const MAX_TITLE_LEN = 120;
const MAX_DESC_LEN  = 240;

/**
 * Two-step bottom sheet to create a group or a channel:
 *
 *   Step 1: Pick members (skipped for channels — the creator can later
 *           share an invite link). Channels start at step 2 directly.
 *   Step 2: Title + description + (optional) avatar emoji + final create.
 *
 * The sheet is built on top of plain framer-motion divs (matching the
 * pattern used by ForwardPicker / WallpaperPicker) so it can layer above
 * the chat drawer without competing with the Radix Sheet stack.
 */
const GroupCreatorSheet: React.FC<GroupCreatorSheetProps> = ({
  isAr, isOpen, onClose, onCreated, initialKind = 'group',
}) => {
  const BackIcon = ChevronRight;
  const ForwardIcon = ArrowLeft;

  const [kind, setKind]                = useState<'group' | 'channel'>(initialKind);
  const [step, setStep]                = useState<Step>(() => initialKind === 'channel' ? 'fill-meta' : 'pick-members');
  const [title, setTitle]              = useState('');
  const [description, setDescription]  = useState('');
  const [memberIds, setMemberIds]      = useState<string[]>([]);
  const [busy, setBusy]                = useState(false);

  // Resolve selected ids back to display names for the pill row.
  const search = useUserSearch('');
  const resolved = useMemo(() => {
    const map = new Map<string, UserSearchResult>(
      search.results.map(r => [r.userId, r]),
    );
    return (id: string) => map.get(id) ?? null;
  }, [search.results]);

  const muts = useChatMutations(null);

  const reset = useCallback(() => {
    setStep(initialKind === 'channel' ? 'fill-meta' : 'pick-members');
    setKind(initialKind);
    setTitle('');
    setDescription('');
    setMemberIds([]);
    setBusy(false);
  }, [initialKind]);

  const close = useCallback(() => {
    if (busy) return;
    onClose();
    // Defer reset so the closing animation isn't visually mid-step.
    setTimeout(reset, 250);
  }, [busy, onClose, reset]);

  const submit = useCallback(async () => {
    if (busy) return;
    if (!title.trim()) return;
    setBusy(true);
    try {
      const created = await muts.createGroup({
        kind,
        title: title.trim().slice(0, MAX_TITLE_LEN),
        description: description.trim().slice(0, MAX_DESC_LEN) || null,
        memberIds: kind === 'group' ? memberIds : [],
      });
      onCreated(created);
      onClose();
      setTimeout(reset, 250);
    } catch {
      /* toast already raised by the mutation */
    } finally {
      setBusy(false);
    }
  }, [busy, title, kind, description, memberIds, muts, onCreated, onClose, reset]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 z-[80] bg-black/45 backdrop-blur-sm"
        onClick={close}
      />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
 className="absolute inset-x-0 bottom-0 z-[81] bg-background rounded-t-3xl flex flex-col max-h-[92%]"
 onClick={e => e.stopPropagation()}
 role="dialog"
 aria-modal="true"
 aria-labelledby="group-creator-title"
 >
 <div className="mx-auto w-10 h-1 rounded-full bg-border/40 mt-2 mb-1" />

 {/* Header */}
 <div className="px-4 h-14 flex items-center gap-2 border-b border-border/15">
 <button
 type="button"
 onClick={() => {
 if (step === 'fill-meta' && kind === 'group') { setStep('pick-members'); return; }
              close();
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40"
            aria-label={'رجوع'}
          >
            <BackIcon className="w-5 h-5 text-foreground" />
          </button>
          <h2 id="group-creator-title" className="text-[16px] font-semibold flex-1 truncate">
            {step === 'pick-members'
              ? ('إضافة أعضاء')
              : kind === 'group'
                ? ('مجموعة جديدة')
                : ('قناة جديدة')}
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

        {/* Body */}
        {step === 'pick-members' ? (
          <div className="flex flex-col flex-1 min-h-0 px-4 py-3 gap-3">
            {/* Kind switch */}
            <div className="flex items-center gap-2">
              <KindChip
                active={kind === 'group'}
                onClick={() => setKind('group')}
                icon={<Users className="w-4 h-4" />}
                label={'مجموعة'}
              />
              <KindChip
                active={kind === 'channel'}
                onClick={() => { setKind('channel'); setStep('fill-meta'); }}
                icon={<Hash className="w-4 h-4" />}
                label={'قناة'}
              />
              <p className="ms-auto text-[11px] text-muted-foreground">
                {`${memberIds.length} مختار`}
              </p>
            </div>

            <div className="flex-1 min-h-0">
              <MemberPicker
                isAr={isAr}
                selectedIds={memberIds}
                onChange={setMemberIds}
                resolveSelected={resolved}
                maxSelected={199}    /* server limit; 200 incl. the owner */
              />
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-border/15">
              <button
                type="button"
                onClick={() => setStep('fill-meta')}
                disabled={memberIds.length === 0}
                className={cn(
                  'w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2',
                  'active:scale-[0.98] transition-transform',
                  memberIds.length === 0 && 'opacity-50',
                )}
              >
                {'التالي'}
                <ForwardIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* fill-meta */
          <div className="flex flex-col flex-1 min-h-0 overflow-y-auto p-4 gap-4">
            {/* Avatar preview */}
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                className="relative h-24 w-24 active:scale-95 transition-transform"
                aria-label={'تغيير الصورة'}
                onClick={() => { /* future: open emoji/avatar picker */ }}
              >
                <GroupAvatar
                  kind={kind}
                  title={title || (kind === 'group' ? '?' : '#')}
 className="h-24 w-24"
 showKindBadge={false}
 />
 <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/0 hover:bg-black/10 transition-colors">
 <Camera className="w-6 h-6 text-white" />
 </div>
 </button>
 <p className="text-[11px] text-muted-foreground">
 {'اختياري'}
              </p>
            </div>

            {/* Title */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">
                {'الاسم'}
                <span className="text-destructive ms-1">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value.slice(0, MAX_TITLE_LEN))}
                placeholder={
                  kind === 'group'
                    ? ('اسم المجموعة')
                    : ('اسم القناة')
                }
                className="w-full bg-muted/30 rounded-2xl px-4 h-11 text-[14px] outline-none focus:ring-2 focus:ring-primary/30"
                autoFocus
                dir="auto"
              />
              <p className="text-[10px] text-muted-foreground/70 text-end mt-1">
                {title.length}/{MAX_TITLE_LEN}
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">
                {'الوصف'}
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value.slice(0, MAX_DESC_LEN))}
                placeholder={'وصف مختصر اختياري'}
                rows={3}
                className="w-full bg-muted/30 rounded-2xl px-4 py-2.5 text-[14px] outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                dir="auto"
              />
              <p className="text-[10px] text-muted-foreground/70 text-end mt-1">
                {description.length}/{MAX_DESC_LEN}
              </p>
            </div>

            {/* Permissions hint */}
            <div className="rounded-2xl bg-muted/15 border border-border/15 p-3.5 text-[12px] text-muted-foreground leading-relaxed">
              {kind === 'group'
                ? ('بإمكان جميع الأعضاء إرسال الرسائل افتراضياً. يمكنك تغيير ذلك من إعدادات المجموعة بعد الإنشاء.')
                : ('في القناة، يمكن للمشرفين فقط نشر الرسائل، ويمكن للأعضاء قراءتها والتفاعل معها.')}
            </div>

            <div className="flex-1" />

            {/* Submit */}
            <div className="pt-2 border-t border-border/15 -mx-4 px-4">
              <button
                type="button"
                disabled={!title.trim() || busy}
                onClick={submit}
                className={cn(
                  'w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2',
                  'active:scale-[0.98] transition-transform',
                  (!title.trim() || busy) && 'opacity-60',
                )}
              >
                {busy
                  ? ('جاري الإنشاء...')
                  : kind === 'group'
                    ? ('إنشاء المجموعة')
                    : ('إنشاء القناة')}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

interface KindChipProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function KindChip({ active, onClick, icon, label }: KindChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 h-8 text-[12px] font-medium transition-all',
        active
          ? 'bg-primary text-primary-foreground '
          : 'bg-muted/30 text-muted-foreground active:bg-muted/50',
      )}
    >
      {icon}{label}
    </button>
  );
}

export default GroupCreatorSheet;
