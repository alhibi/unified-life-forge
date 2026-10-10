import { AnimatePresence, motion } from 'framer-motion';
import React, { useState } from 'react';

import { AppCard, IconButton } from '@/components/ui/app-shell';
import { eventTypeConfig, poetTimelines } from '@/features/diwan/data/poetTimelines';
import { ChevronDown, X } from '@/lib/icons';

interface PoetTimelineProps {
  poetId: string;
  poetName: string;
  onClose: () => void;
}

/**
 * السيرة الزمنية للشاعر — سطور محطّات قابلة للتوسيع داخل بطاقة واحدة.
 * ألوان أنواع المحطّات بيانات (مفتاح نوع الحدث) فتبقى كما هي؛ أما
 * الأسطح فالآن من <AppCard> والزر الأيقوني من <IconButton> القياسي،
 * وبلا خطوط فاصلة ميتة (كان في الشجرة عنصران بلا خلفية إطلاقاً).
 */
export default function PoetTimeline({ poetId, poetName, onClose }: PoetTimelineProps) {
  const events = poetTimelines[poetId];
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  if (!events || events.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
    >
      <AppCard className="overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border/30 px-4 py-3">
          <div className="min-w-0">
            <h3 className="truncate font-amiri text-meta font-bold text-foreground">
              مسيرة {poetName}
            </h3>
            <p className="mt-0.5 text-micro text-muted-foreground">
              {events.length} محطّات في حياته
            </p>
          </div>
          <IconButton onClick={onClose} aria-label="إغلاق السيرة الزمنية">
            <X className="h-4 w-4" aria-hidden />
          </IconButton>
        </div>

        {/* Timeline */}
        <div className="px-4 py-4">
          <div className="space-y-1">
            {events.map((event, index) => {
              const config = eventTypeConfig[event.type];
              const isExpanded = expandedIndex === index;

              return (
                <div key={index} className="relative">
                  <button
                    type="button"
                    onClick={() => setExpandedIndex(isExpanded ? null : index)}
                    aria-expanded={isExpanded}
                    className="group w-full rounded-md py-2 pe-1 ps-0 text-start transition-colors duration-fast hover:bg-interactive-hover"
                  >
                    <div className="flex items-start gap-3">
                      {/* Timeline dot */}
                      <div className="relative z-raised flex w-[14px] shrink-0 justify-center pt-1">
                        <motion.div
                          animate={{ scale: isExpanded ? 1.3 : 1 }}
                          className="flex h-3.5 w-3.5 items-center justify-center rounded-full border-2"
                          style={{
                            borderColor: config.color,
                            backgroundColor: isExpanded ? config.color : 'transparent',
                          }}
                        >
                          {isExpanded && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="h-1.5 w-1.5 rounded-full bg-background"
                            />
                          )}
                        </motion.div>
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {/* Year badge */}
                          <span
                            className="shrink-0 rounded-md px-2 py-0.5 text-micro font-bold tabular-nums"
                            style={{
                              color: config.color,
                              backgroundColor: `${config.color}15`,
                            }}
                          >
                            {event.year}
                          </span>
                          {/* Icon */}
                          <span className="text-mini">{config.icon}</span>
                          {/* Title */}
                          <span className="truncate text-mini font-semibold text-foreground">
                            {event.title}
                          </span>
                        </div>

                        {/* Description - always visible preview */}
                        <p
                          className={`mt-1 text-micro leading-relaxed text-muted-foreground ${
                            isExpanded ? '' : 'line-clamp-1'
                          }`}
                        >
                          {event.description}
                        </p>
                      </div>

                      {/* Expand indicator */}
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        className="mt-1 shrink-0"
                      >
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-opacity ${
                            isExpanded
                              ? 'text-muted-foreground opacity-100'
                              : 'text-muted-foreground opacity-0 group-hover:opacity-100'
                          }`}
                        />
                      </motion.div>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="ms-[26px] overflow-hidden"
                      >
                        <div
                          className="mb-2 rounded-lg border-s-2 px-3 py-2"
                          style={{
                            backgroundColor: `${config.color}08`,
                            borderColor: config.color,
                          }}
                        >
                          <p className="text-mini leading-[1.8] text-foreground/80">
                            {event.description}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <span
                              className="rounded-full px-2 py-0.5 text-micro font-medium"
                              style={{
                                color: config.color,
                                backgroundColor: `${config.color}15`,
                              }}
                            >
                              {event.type === 'birth'
                                ? 'ولادة'
                                : event.type === 'death'
                                  ? 'وفاة'
                                  : event.type === 'poem'
                                    ? 'شعر'
                                    : event.type === 'political'
                                      ? 'حدث سياسي'
                                      : event.type === 'travel'
                                        ? 'ترحال'
                                        : 'محطّة'}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Footer stats */}
          <div className="mt-4 flex items-center justify-between border-t border-border/30 pt-3">
            <div className="flex items-center gap-3">
              {Array.from(new Set(events.map((e) => e.type))).map((type) => (
                <span key={type} className="flex items-center gap-1">
                  <span className="text-micro">{eventTypeConfig[type].icon}</span>
                  <span className="text-micro text-muted-foreground">
                    {events.filter((e) => e.type === type).length}
                  </span>
                </span>
              ))}
            </div>
            {events[0]?.year && events[events.length - 1]?.year && (
              <span className="text-micro text-muted-foreground">
                {events[0].year} — {events[events.length - 1].year}
              </span>
            )}
          </div>
        </div>
      </AppCard>
    </motion.div>
  );
}
