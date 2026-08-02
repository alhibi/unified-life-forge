/**
 * Mihrab → Dhikr tab.
 *
 * Two changes of substance from the previous version:
 *
 *  1. It opens with a working tasbih (`DhikrCounter`). The tab used to be a
 *     browser for dua *text* with nothing to actually count.
 *  2. The three hand-rolled modals are gone. They rendered their own
 *     `createPortal`, their own `bg-black/60` scrim, their own body-scroll lock
 *     (which wrote `position: fixed` onto <body> and restored scroll manually),
 *     and their own Escape handling — none of which participated in the app's
 *     overlay contract, so a dialog could be left open behind a navigation and
 *     focus was never trapped. They now use the shared `Dialog`, which owns the
 *     scrim (`.app-scrim`), the stacking level, the focus trap, the scroll lock
 *     and the enter/exit timings.
 */
import { motion } from 'framer-motion';
import React, { useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { type NawawiHadith, nawawiHadiths } from '@/data/nawawiHadiths';
import {
  duaCategories,
  type DuaCategory,
  type FrequentDua,
  frequentDuas,
} from '@/features/duas/data/duas';
import DhikrCounter from '@/features/mihrab/components/DhikrCounter';
import {
  BookOpen,
  Building,
  Car,
  Check,
  ChevronLeft,
  CloudRain,
  Copy,
  DoorOpen,
  Droplets,
  Flag,
  Globe,
  Heart,
  HelpCircle,
  Home,
  Leaf,
  Moon,
  Plane,
  Shield,
  Star,
  Sun,
  Users,
  Zap,
} from '@/lib/icons';
import { pageItem as item, pageStagger as stagger } from '@/lib/motion';
import { notify } from '@/lib/notify';

const iconMap: Record<string, React.ElementType> = {
  Moon,
  Sun,
  Plane,
  Home,
  HelpCircle,
  Car,
  DoorOpen,
  Building,
  Users,
  Globe,
  Droplets,
  Zap,
  Shield,
  Star,
  Leaf,
  Flag,
  Heart,
  CloudRain,
};

/** Arabic scripture body copy — serif face, generous leading. */
const SCRIPTURE_STYLE: React.CSSProperties = {
  fontFamily: "'Amiri', 'Noto Sans Arabic', serif",
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(text);
        setCopied(true);
        notify.copied();
        window.setTimeout(() => setCopied(false), 1500);
      }}
      aria-label={label}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-fast hover:bg-muted hover:text-foreground"
    >
      {copied ? (
        <Check className="h-4 w-4 text-success" aria-hidden />
      ) : (
        <Copy className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}

function DuaDialog({
  open,
  onOpenChange,
  title,
  duas,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  duas: { id: number; text: string; source?: string }[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{`${duas.length} دعاء`}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {duas.map((dua) => (
            <div key={dua.id} className="rounded-md border border-border p-3">
              <p className="text-lead leading-loose text-foreground" dir="rtl" style={SCRIPTURE_STYLE}>
                {dua.text}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-mini text-muted-foreground">{dua.source ?? ''}</span>
                <CopyButton text={dua.text} label="نسخ الدعاء" />
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FrequentDuaCard({ dua }: { dua: FrequentDua }) {
  const [open, setOpen] = useState(false);
  const Icon = (iconMap[dua.icon] || Star) as React.ComponentType<any>;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 flex-col items-center gap-1.5 rounded-md p-2 transition-colors duration-fast hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-md bg-secondary text-foreground">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <span className="line-clamp-2 w-16 text-center text-micro font-medium leading-tight text-foreground">
          {dua.titleAr}
        </span>
      </button>
      <DuaDialog
        open={open}
        onOpenChange={setOpen}
        title={dua.titleAr}
        duas={[
          { id: 1, text: dua.text, source: dua.source },
          ...(dua.extras || []).map((e, i) => ({ id: i + 2, text: e.text, source: e.source })),
        ]}
      />
    </>
  );
}

function NawawiDialogs({
  listOpen,
  onListOpenChange,
  selected,
  onSelect,
}: {
  listOpen: boolean;
  onListOpenChange: (open: boolean) => void;
  selected: NawawiHadith | null;
  onSelect: (hadith: NawawiHadith | null) => void;
}) {
  return (
    <>
      <Dialog open={listOpen} onOpenChange={onListOpenChange}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>الأربعون النووية</DialogTitle>
            <DialogDescription>{`${nawawiHadiths.length} حديثاً`}</DialogDescription>
          </DialogHeader>
          <ul className="space-y-1.5">
            {nawawiHadiths.map((hadith) => (
              <li key={hadith.id}>
                <button
                  type="button"
                  onClick={() => {
                    onListOpenChange(false);
                    onSelect(hadith);
                  }}
                  className="flex min-h-11 w-full items-center gap-3 rounded-md p-2 text-start transition-colors duration-fast hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-border text-micro font-semibold tabular-nums text-muted-foreground">
                    {hadith.id}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-meta font-semibold text-foreground">{hadith.title}</span>
                    <span className="block truncate text-mini text-muted-foreground" dir="rtl">
                      {hadith.text.slice(0, 70)}…
                    </span>
                  </span>
                  <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && onSelect(null)}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{`${selected.id}. ${selected.title}`}</DialogTitle>
                <DialogDescription>{selected.source}</DialogDescription>
              </DialogHeader>
              <div className="rounded-md border border-border p-3">
                <p className="text-lead leading-loose text-foreground" dir="rtl" style={SCRIPTURE_STYLE}>
                  {selected.text}
                </p>
                <div className="mt-2 flex justify-end">
                  <CopyButton text={selected.text} label="نسخ الحديث" />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function DhikrTab() {
  const [openCat, setOpenCat] = useState<DuaCategory | null>(null);
  const [openNawawi, setOpenNawawi] = useState<NawawiHadith | null>(null);
  const [showNawawiList, setShowNawawiList] = useState(false);

  return (
    <>
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">
        <motion.div variants={item}>
          <DhikrCounter />
        </motion.div>

        <motion.button
          variants={item}
          type="button"
          onClick={() => setShowNawawiList(true)}
          className="app-card app-card-pressable flex w-full items-center gap-3 text-start"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground">
            <BookOpen className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-meta font-semibold text-foreground">الأربعون النووية</span>
            <span className="mt-0.5 block text-mini text-muted-foreground">{`${nawawiHadiths.length} حديثاً نبوياً`}</span>
          </span>
          <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden />
        </motion.button>

        <motion.section variants={item} aria-label="أدعية متكررة">
          <p className="app-section-label mb-2">أدعية متكررة</p>
          <div className="grid grid-cols-4 gap-1">
            {frequentDuas.map((dua) => (
              <FrequentDuaCard key={dua.id} dua={dua} />
            ))}
          </div>
        </motion.section>

        <motion.section variants={item} aria-label="أقسام الأدعية">
          <p className="app-section-label mb-2">أقسام الأدعية</p>
          <div className="space-y-2">
            {duaCategories.map((cat) => {
              const Icon = (iconMap[cat.icon] || Star) as React.ComponentType<any>;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setOpenCat(cat)}
                  className="app-card app-card-compact app-card-pressable flex w-full items-center gap-3 text-start"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-meta font-semibold text-foreground">{cat.titleAr}</span>
                    <span className="mt-0.5 block text-mini text-muted-foreground">{`${cat.duas.length} دعاء`}</span>
                  </span>
                  <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden />
                </button>
              );
            })}
          </div>
        </motion.section>
      </motion.div>

      {openCat && (
        <DuaDialog
          open={openCat !== null}
          onOpenChange={(open) => !open && setOpenCat(null)}
          title={openCat.titleAr}
          duas={openCat.duas}
        />
      )}

      <NawawiDialogs
        listOpen={showNawawiList}
        onListOpenChange={setShowNawawiList}
        selected={openNawawi}
        onSelect={setOpenNawawi}
      />
    </>
  );
}
