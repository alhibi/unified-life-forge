import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, CheckCheck, Clock, Pencil, ChevronRight } from '@/lib/icons';
import { cn } from '@/lib/utils';
import type { Message } from './types';
import { readableFileName } from '@/lib/chat/imageMeta';

interface MessageInfoProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message | null;
}

/** Format an ISO timestamp like Telegram's "8 May at 14:32:11". */
function fmtFull(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('ar', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

/**
 * Telegram-style message-info sheet. Shows the precise sent / delivered /
 * read / edited timestamps for a single message. Only meaningful for
 * messages I sent — used by the long-press action menu.
 */
const MessageInfo: React.FC<MessageInfoProps> = ({ isOpen, onClose, message }) => {
  const BackIcon = ChevronRight;
  return (
    <AnimatePresence>
      {isOpen && message && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[80] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
 className="absolute inset-x-0 bottom-0 z-[81] bg-background rounded-t-3xl flex flex-col max-h-[70%]"
 onClick={(e) => e.stopPropagation()}
 role="dialog"
 aria-modal="true"
 aria-labelledby="message-info-title"
 >
 <div className="mx-auto w-10 h-1 rounded-full bg-border/40 mt-2 mb-1" />
 <div className="px-4 h-14 flex items-center gap-2 border-b border-border/15">
 <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40 transition-colors" aria-label={'إغلاق'}>
                <BackIcon className="w-5 h-5 text-foreground" />
              </button>
              <h2 id="message-info-title" className="text-[16px] font-semibold">{'معلومات الرسالة'}</h2>
              <div className="flex-1" />
              <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3">
              {/* Quick preview of the message body */}
              <div className="rounded-2xl bg-muted/20 border border-border/15 px-3 py-2.5">
                <p className="text-[13px] text-foreground/80 line-clamp-3" dir="auto">
                  {message.deleted
                    ? ('🚫 رسالة محذوفة')
                    : message.message_type === 'image'
                      ? '📷 ' + ((message.content || '').trim() || ('صورة'))
                      : message.message_type === 'voice'
                        ? '🎤 ' + ('رسالة صوتية')
                        : message.message_type === 'file'
                          ? '📎 ' + (readableFileName(message.file_name) || ('ملف'))
                          : message.content}
                </p>
              </div>

              {/* Timeline */}
              <div className="rounded-2xl bg-card border border-border/20 divide-y divide-border/10">
                <Row
                  icon={<Check className="w-4 h-4" />}
                  label={'أُرسلت'}
                  value={fmtFull(message.created_at)}
                  iconClass="text-muted-foreground"
                />
                <Row
                  icon={<CheckCheck className={cn('w-4 h-4', message.delivered_at ? 'text-foreground' : 'text-muted-foreground/50')} />}
                  label={'وصلت'}
                  value={message.delivered_at ? fmtFull(message.delivered_at) : ('لم تصل بعد')}
                  iconClass={message.delivered_at ? 'text-foreground' : 'text-muted-foreground/50'}
                />
                <Row
                  icon={<CheckCheck className={cn('w-4 h-4', message.read ? 'text-primary' : 'text-muted-foreground/50')} />}
                  label={'مقروءة'}
                  value={message.read ? ('نعم') : ('لم تُقرأ بعد')}
                  iconClass={message.read ? 'text-primary' : 'text-muted-foreground/50'}
                />
                {message.edited_at && (
                  <Row
                    icon={<Pencil className="w-4 h-4" />}
                    label={'عُدّلت'}
                    value={fmtFull(message.edited_at)}
                    iconClass="text-muted-foreground"
                  />
                )}
                {message.expires_at && (
                  <Row
                    icon={<Clock className="w-4 h-4" />}
                    label={'تنتهي صلاحيتها'}
                    value={fmtFull(message.expires_at)}
                    iconClass="text-amber-500"
                  />
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

interface RowProps { icon: React.ReactNode; label: string; value: string; iconClass?: string }
function Row({ icon, label, value, iconClass }: RowProps) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-3">
      <span className={cn('shrink-0', iconClass)}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-[13px] text-foreground font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

export default MessageInfo;
