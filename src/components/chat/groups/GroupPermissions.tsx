import React, { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Users, MessageSquareText, Image as ImageIcon,
  Link2, Pin, UserPlus, Pencil, Eye, Lock, Unlock,
  ChevronDown, Check, Crown,
} from '@/lib/icons';
import { cn } from '@/lib/utils';
import { useChatMutations, type ChatSummary } from '@/lib/chat';
import { toast } from 'sonner';

interface GroupPermissionsProps {
  isAr: boolean;
  chat: ChatSummary;
  isAdmin: boolean;
  isOwner: boolean;
}

type PermissionLevel = 'all' | 'admins' | 'owner';

interface PermissionRow {
  id: string;
  icon: React.ElementType;
  labelAr: string;
  labelDe: string;
  descAr: string;
  descDe: string;
  value: PermissionLevel;
  options: PermissionLevel[];
}

const PERMISSION_LABELS: Record<PermissionLevel, { ar: string; de: string }> = {
  all:    { ar: 'الجميع', de: 'Alle' },
  admins: { ar: 'المشرفون فقط', de: 'Nur Admins' },
  owner:  { ar: 'المالك فقط', de: 'Nur Eigentümer' },
};

/**
 * GroupPermissions — comprehensive permission management panel for group/channel
 * admins. Telegram-style granular control over who can do what.
 *
 * Permissions managed:
 *  - Who can send messages
 *  - Who can send media/files
 *  - Who can add members
 *  - Who can edit chat info
 *  - Who can pin messages
 *  - Who can invite via link
 *
 * Only visible to admins and owners. Owner has extra options (like transfer ownership).
 */
const GroupPermissions: React.FC<GroupPermissionsProps> = ({
  isAr, chat, isAdmin, isOwner,
}) => {
  const muts = useChatMutations(chat.id);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const permissions: PermissionRow[] = [
    {
      id: 'send_messages',
      icon: MessageSquareText,
      labelAr: 'إرسال الرسائل',
      labelDe: 'Nachrichten senden',
      descAr: 'من يمكنه إرسال رسائل في هذه المجموعة',
      descDe: 'Wer darf in dieser Gruppe Nachrichten senden',
      value: chat.whoCanSend || 'all',
      options: ['all', 'admins'],
    },
    {
      id: 'add_members',
      icon: UserPlus,
      labelAr: 'إضافة أعضاء',
      labelDe: 'Mitglieder hinzufügen',
      descAr: 'من يمكنه إضافة أعضاء جدد',
      descDe: 'Wer darf neue Mitglieder hinzufügen',
      value: 'all',
      options: ['all', 'admins'],
    },
    {
      id: 'edit_info',
      icon: Pencil,
      labelAr: 'تعديل معلومات المجموعة',
      labelDe: 'Gruppeninfo bearbeiten',
      descAr: 'من يمكنه تغيير الاسم والصورة والوصف',
      descDe: 'Wer darf Name, Bild und Beschreibung ändern',
      value: 'admins',
      options: ['all', 'admins', 'owner'],
    },
    {
      id: 'pin_messages',
      icon: Pin,
      labelAr: 'تثبيت الرسائل',
      labelDe: 'Nachrichten anpinnen',
      descAr: 'من يمكنه تثبيت رسائل في المجموعة',
      descDe: 'Wer darf Nachrichten in der Gruppe anpinnen',
      value: 'admins',
      options: ['all', 'admins'],
    },
    {
      id: 'send_media',
      icon: ImageIcon,
      labelAr: 'إرسال الوسائط',
      labelDe: 'Medien senden',
      descAr: 'من يمكنه إرسال صور وملفات وصوتيات',
      descDe: 'Wer darf Fotos, Dateien und Sprachnachrichten senden',
      value: 'all',
      options: ['all', 'admins'],
    },
    {
      id: 'invite_link',
      icon: Link2,
      labelAr: 'إنشاء رابط دعوة',
      labelDe: 'Einladungslink erstellen',
      descAr: 'من يمكنه إنشاء ومشاركة روابط الدعوة',
      descDe: 'Wer darf Einladungslinks erstellen und teilen',
      value: 'admins',
      options: ['all', 'admins', 'owner'],
    },
  ];

  const handlePermissionChange = useCallback(async (permId: string, newValue: PermissionLevel) => {
    setSaving(true);
    try {
      if (permId === 'send_messages') {
        await muts.updatePermissions({ chatId: chat.id, whoCanSend: newValue as 'all' | 'admins' });
      } else if (permId === 'add_members') {
        await muts.updatePermissions({ chatId: chat.id, whoCanAddMembers: newValue as 'all' | 'admins' });
      } else if (permId === 'edit_info') {
        await muts.updatePermissions({ chatId: chat.id, whoCanEditMeta: newValue as 'admins' | 'owner' });
      }
      toast.success(isAr ? 'تم تحديث الصلاحيات' : 'Berechtigungen aktualisiert');
    } catch {
      toast.error(isAr ? 'فشل تحديث الصلاحيات' : 'Fehler beim Aktualisieren');
    } finally {
      setSaving(false);
      setExpandedId(null);
    }
  }, [chat.id, muts, isAr]);

  if (!isAdmin && !isOwner) return null;

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center gap-2 px-1 mb-3">
        <Shield className="w-4 h-4 text-primary" />
        <h3 className="text-[14px] font-semibold text-foreground">
          {isAr ? 'صلاحيات المجموعة' : 'Gruppenberechtigungen'}
        </h3>
        {isOwner && (
          <span className="text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
            <Crown className="w-2.5 h-2.5" />
            {isAr ? 'مالك' : 'Eigentümer'}
          </span>
        )}
      </div>

      {/* Permission rows */}
      <div className="space-y-0.5">
        {permissions.map((perm) => {
          const Icon = perm.icon;
          const isExpanded = expandedId === perm.id;
          const currentLabel = PERMISSION_LABELS[perm.value];

          return (
            <div key={perm.id} className="rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : perm.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 text-start transition-colors',
                  isExpanded ? 'bg-muted/30' : 'hover:bg-muted/15 active:bg-muted/25'
                )}
                disabled={saving}
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground">
                    {isAr ? perm.labelAr : perm.labelDe}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {isAr ? currentLabel.ar : currentLabel.de}
                  </p>
                </div>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </motion.div>
              </button>

              {/* Expanded options */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-2 space-y-0.5">
                      <p className="text-[11px] text-muted-foreground/70 px-2 pb-1">
                        {isAr ? perm.descAr : perm.descDe}
                      </p>
                      {perm.options.map((opt) => {
                        const optLabel = PERMISSION_LABELS[opt];
                        const isSelected = perm.value === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handlePermissionChange(perm.id, opt)}
                            disabled={saving}
                            className={cn(
                              'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors',
                              isSelected
                                ? 'bg-primary/10 border border-primary/20'
                                : 'hover:bg-muted/20 active:bg-muted/30'
                            )}
                          >
                            <div className={cn(
                              'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                              isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/40'
                            )}>
                              {isSelected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                            </div>
                            <span className={cn(
                              'text-[12.5px]',
                              isSelected ? 'font-medium text-primary' : 'text-foreground/80'
                            )}>
                              {isAr ? optLabel.ar : optLabel.de}
                            </span>
                            {opt === 'all' && <Unlock className="w-3 h-3 text-muted-foreground/50 ms-auto" />}
                            {opt === 'admins' && <Shield className="w-3 h-3 text-muted-foreground/50 ms-auto" />}
                            {opt === 'owner' && <Crown className="w-3 h-3 text-muted-foreground/50 ms-auto" />}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Slow mode toggle (channel-style) */}
      {chat.kind === 'channel' && (
        <div className="mt-3 px-3 py-2.5 rounded-xl bg-muted/10 border border-border/15">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-orange-500" />
              <div>
                <p className="text-[12.5px] font-medium text-foreground">
                  {isAr ? 'الوضع البطيء' : 'Langsamer Modus'}
                </p>
                <p className="text-[10.5px] text-muted-foreground">
                  {isAr ? 'تحديد وقت بين كل رسالتين' : 'Zeitlimit zwischen Nachrichten'}
                </p>
              </div>
            </div>
            <div className="w-9 h-5 rounded-full bg-muted/40 relative cursor-pointer">
              <div className="absolute top-0.5 start-0.5 w-4 h-4 rounded-full bg-muted-foreground/40 transition-transform" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupPermissions;
