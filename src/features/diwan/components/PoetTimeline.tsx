import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown } from '@/lib/icons';
import { poetTimelines, eventTypeConfig } from '@/features/diwan/data/poetTimelines';

interface PoetTimelineProps {
  poetId: string;
  poetName: string;
  onClose: () => void;
}

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
      className="w-full rounded-2xl bg-card border border-border/40 overflow-hidden "
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 ">
        <div>
          <h3
            className="font-bold text-[15px] text-foreground"
            style={{ fontFamily: "'Amiri', serif" }}
          >
            مسيرة {poetName}
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {events.length} محطّات في حياته
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Timeline */}
      <div className="relative px-4 py-4">
        {/* Vertical line */}
        <div className="absolute top-4 bottom-4 start-[30px] w-[2px] rounded-full" />

        <div className="space-y-1">
          {events.map((event, index) => {
            const config = eventTypeConfig[event.type];
            const isExpanded = expandedIndex === index;
            const isLast = index === events.length - 1;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="relative"
              >
                <button
                  onClick={() => setExpandedIndex(isExpanded ? null : index)}
                  className="w-full flex items-start gap-3 ps-0 pe-1 py-2 rounded-xl hover:bg-muted/30 active:bg-muted/50 transition-colors text-start group"
                >
                  {/* Timeline dot */}
                  <div className="relative z-10 flex-shrink-0 w-[14px] flex justify-center pt-1">
                    <motion.div
                      animate={{ scale: isExpanded ? 1.3 : 1 }}
                      className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center"
                      style={{
                        borderColor: config.color,
                        backgroundColor: isExpanded ? config.color : 'transparent',
                      }}
                    >
                      {isExpanded && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-1.5 h-1.5 rounded-full bg-white"
                        />
                      )}
                    </motion.div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {/* Year badge */}
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md flex-shrink-0"
                        style={{
                          color: config.color,
                          backgroundColor: `${config.color}15`,
                        }}
                      >
                        {event.year}
                      </span>
                      {/* Icon */}
                      <span className="text-[12px]">{config.icon}</span>
                      {/* Title */}
                      <span className="text-[13px] font-semibold text-foreground truncate">
                        {event.title}
                      </span>
                    </div>

                    {/* Description - always visible preview */}
                    <p className={`text-[11px] text-muted-foreground leading-relaxed mt-1 ${isExpanded ? '' : 'line-clamp-1'}`}>
                      {event.description}
                    </p>
                  </div>

                  {/* Expand indicator */}
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    className="flex-shrink-0 mt-1"
                  >
                    <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.div>
                </button>

                {/* Expanded detail */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden ms-[26px]"
                    >
                      <div
                        className="py-2 px-3 rounded-lg mb-2 border-s-2"
                        style={{
                          backgroundColor: `${config.color}08`,
                          borderColor: config.color,
                        }}
                      >
                        <p className="text-[12px] text-foreground/80 leading-[1.8]">
                          {event.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className="text-[9px] px-2 py-0.5 rounded-full font-medium"
                            style={{
                              color: config.color,
                              backgroundColor: `${config.color}15`,
                            }}
                          >
                            {event.type === 'birth' ? 'ولادة' :
                             event.type === 'death' ? 'وفاة' :
                             event.type === 'poem' ? 'شعر' :
                             event.type === 'political' ? 'حدث سياسي' :
                             event.type === 'travel' ? 'ترحال' : 'محطّة'}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Connector to next */}
                {!isLast && (
                  <div className="absolute start-[30px] top-[34px] bottom-0 w-[2px]" />
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Footer stats */}
        <div className="mt-4 pt-3 border-t border-border/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {Array.from(new Set(events.map(e => e.type))).map(type => (
              <span key={type} className="flex items-center gap-1">
                <span className="text-[11px]">{eventTypeConfig[type].icon}</span>
                <span className="text-[9px] text-muted-foreground">
                  {events.filter(e => e.type === type).length}
                </span>
              </span>
            ))}
          </div>
          {events[0]?.year && events[events.length - 1]?.year && (
            <span className="text-[10px] text-muted-foreground">
              {events[0].year} — {events[events.length - 1].year}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
