import { motion } from 'framer-motion';
import React from 'react';

import { AppCard } from '@/components/ui/app-shell';
import { ExternalLink, MessageSquareText, Pin, X } from '@/lib/icons';

import type { MgArticle, MgConnection } from '../types';
import { CONFIDENCE_LABEL, LENS_LABEL } from '../types';

interface Props {
  connection: MgConnection;
  articles: Map<string, MgArticle>;
  pinned?: boolean;
  note?: string | null;
  onPin?: (c: MgConnection) => void;
  onDismiss?: (c: MgConnection) => void;
  onDiscuss?: (c: MgConnection) => void;
  onNoteChange?: (value: string) => void;
}

/** One discovered link between two or three archived essays. */
const ConnectionCard: React.FC<Props> = ({
  connection, articles, pinned, note, onPin, onDismiss, onDiscuss, onNoteChange,
}) => {
  const linked = connection.article_ids.map((id) => articles.get(id)).filter(Boolean) as MgArticle[];

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }}>
      <AppCard className="space-y-3">
        <div className="flex items-center gap-2 text-[0.6875rem] font-bold">
          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            {LENS_LABEL[connection.lens] ?? connection.lens}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {CONFIDENCE_LABEL[connection.confidence_label] ?? connection.confidence_label}
          </span>
          <span className="ms-auto text-muted-foreground tabular-nums">
            الطرافة {connection.novelty_score}/10
          </span>
        </div>

        <p className="text-sm leading-relaxed text-foreground whitespace-pre-line">
          {connection.connection_text}
        </p>

        {connection.why_it_matters && (
          <p className="text-[0.8125rem] leading-relaxed text-muted-foreground border-s-2 border-primary/30 ps-3">
            {connection.why_it_matters}
          </p>
        )}

        <div className="space-y-1.5">
          {linked.map((a) => (
            <a
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span className="line-clamp-2">{a.title || a.url}</span>
            </a>
          ))}
        </div>

        {pinned && onNoteChange && (
          <textarea
            value={note ?? ''}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="ملاحظتك على هذا الرابط…"
            rows={2}
            className="w-full text-base rounded-xl bg-muted/40 border border-border/40 p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        )}

        <div className="flex items-center gap-2 pt-1">
          {onDiscuss && (
            <button
              type="button"
              onClick={() => onDiscuss(connection)}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-primary/10 text-primary active:scale-95 transition"
            >
              <MessageSquareText className="w-3.5 h-3.5" />
              ناقشه
            </button>
          )}
          {onPin && !pinned && (
            <button
              type="button"
              onClick={() => onPin(connection)}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-muted text-foreground active:scale-95 transition"
            >
              <Pin className="w-3.5 h-3.5" />
              ثبّت
            </button>
          )}
          {onDismiss && (
            <button
              type="button"
              onClick={() => onDismiss(connection)}
              aria-label="إخفاء الرابط"
              className="ms-auto flex items-center gap-1.5 text-xs text-muted-foreground px-2 py-1.5 rounded-lg hover:text-foreground active:scale-95 transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </AppCard>
    </motion.div>
  );
};

export default ConnectionCard;
