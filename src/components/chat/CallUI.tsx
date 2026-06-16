import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, PhoneOff, Video, VideoOff, Mic, MicOff,
  Volume2, VolumeX, MoreVertical, Maximize2, Minimize2,
  PhoneIncoming, PhoneOutgoing, X,
} from '@/lib/icons';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getDefaultAvatarForUser } from '@/utils/defaultAvatar';

// ─────────────────────────────────────────────────────────────────────────────
// CallUI — WhatsApp/Telegram-style voice/video call interface.
// Supports: incoming call screen, outgoing call, active call with controls.
// ─────────────────────────────────────────────────────────────────────────────

export type CallState = 'idle' | 'incoming' | 'outgoing' | 'connecting' | 'active' | 'ended';
export type CallType = 'voice' | 'video';

export interface CallParticipant {
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string | null;
}

interface CallUIProps {
  isAr: boolean;
  state: CallState;
  type: CallType;
  participant: CallParticipant;
  duration?: number;
  onAccept?: () => void;
  onDecline?: () => void;
  onHangUp?: () => void;
  onToggleMute?: () => void;
  onToggleVideo?: () => void;
  onToggleSpeaker?: () => void;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isSpeaker?: boolean;
}

function formatCallDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Pulsing ring animation for incoming/outgoing calls
function PulsingRings() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="absolute w-32 h-32 rounded-full border-2 border-primary/30"
          animate={{
            scale: [1, 1.8, 2.2],
            opacity: [0.6, 0.2, 0],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            delay: i * 0.6,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

// Call action button
function CallButton({
  icon: Icon,
  label,
  active,
  danger,
  large,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  danger?: boolean;
  large?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1.5',
      )}
      whileTap={{ scale: 0.9 }}
    >
      <div className={cn(
        'rounded-full flex items-center justify-center transition-colors',
        large ? 'w-16 h-16' : 'w-12 h-12',
        danger
          ? 'bg-red-500 text-white '
          : active
            ? 'bg-white/20 text-white'
            : 'bg-white/10 text-white/80 active:bg-white/20'
      )}>
        <Icon className={cn(large ? 'w-7 h-7' : 'w-5 h-5')} />
      </div>
      <span className="text-[10px] text-white/70 font-medium">{label}</span>
    </motion.button>
  );
}

/**
 * Full-screen call interface.
 * - Incoming: avatar + accept/decline buttons with pulsing animation
 * - Outgoing: avatar + "calling..." status + hang up
 * - Active: timer + control buttons (mute, video, speaker, hang up)
 */
const CallUI: React.FC<CallUIProps> = ({
  isAr, state, type, participant, duration = 0,
  onAccept, onDecline, onHangUp,
  onToggleMute, onToggleVideo, onToggleSpeaker,
  isMuted = false, isVideoOff = false, isSpeaker = false,
}) => {
  if (state === 'idle') return null;

  const defaultAvatar = getDefaultAvatarForUser(participant.username || '?');
  const displayName = participant.displayName || participant.username;

  const statusText = (() => {
    switch (state) {
      case 'incoming': return isAr ? 'مكالمة واردة...' : 'Eingehender Anruf...';
      case 'outgoing': return isAr ? 'جاري الاتصال...' : 'Wird angerufen...';
      case 'connecting': return isAr ? 'جاري الاتصال...' : 'Verbindung wird hergestellt...';
      case 'active': return formatCallDuration(duration);
      case 'ended': return isAr ? 'انتهت المكالمة' : 'Anruf beendet';
      default: return '';
    }
  })();

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Background */}
      <div className="absolute inset-0 " />

      {/* Blur backdrop when video is off */}
      {(type === 'voice' || isVideoOff) && (
        <div className="absolute inset-0 backdrop-blur-3xl">
          <div className="absolute inset-0 " />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6">
        {/* Pulsing rings for incoming/outgoing */}
        {(state === 'incoming' || state === 'outgoing' || state === 'connecting') && <PulsingRings />}

        {/* Call type badge */}
        <motion.div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm mb-6"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          {type === 'video' ? <Video className="w-3.5 h-3.5 text-white/70" /> : <Phone className="w-3.5 h-3.5 text-white/70" />}
          <span className="text-[11px] text-white/70 font-medium">
            {type === 'video'
              ? (isAr ? 'مكالمة فيديو' : 'Videoanruf')
              : (isAr ? 'مكالمة صوتية' : 'Sprachanruf')}
          </span>
        </motion.div>

        {/* Avatar */}
        <motion.div
          className="relative mb-6"
          animate={state === 'active' ? {} : { scale: [1, 1.02, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Avatar className="w-28 h-28 ring-4 ring-white/10">
            {participant.avatarUrl ? (
              <AvatarImage src={participant.avatarUrl} className="object-cover" />
            ) : (
              <img src={defaultAvatar} alt="" className="w-full h-full object-cover" />
            )}
            <AvatarFallback className="bg-primary/30 text-white text-3xl font-bold">
              {(participant.username || '?')[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </motion.div>

        {/* Name & status */}
        <motion.h2
          className="text-white text-[22px] font-bold mb-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {displayName}
        </motion.h2>
        <motion.p
          className={cn(
            'text-[14px] font-medium tabular-nums',
            state === 'active' ? 'text-green-400' : 'text-white/60'
          )}
          key={statusText}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {statusText}
        </motion.p>
      </div>

      {/* Controls */}
      <div className="relative z-10 pb-12 pt-6 px-6">
        {state === 'incoming' ? (
          /* Incoming: Decline (red) + Accept (green) */
          <div className="flex items-center justify-center gap-16">
            <CallButton
              icon={PhoneOff}
              label={isAr ? 'رفض' : 'Ablehnen'}
              danger
              large
              onClick={onDecline}
            />
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              <button
                type="button"
                onClick={onAccept}
                className="w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center "
              >
                {type === 'video' ? <Video className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
              </button>
              <p className="text-[10px] text-white/70 font-medium text-center mt-1.5">
                {isAr ? 'قبول' : 'Annehmen'}
              </p>
            </motion.div>
          </div>
        ) : state === 'active' ? (
          /* Active: Mute + Video + Speaker + HangUp */
          <div className="flex items-center justify-center gap-6">
            <CallButton
              icon={isMuted ? MicOff : Mic}
              label={isMuted ? (isAr ? 'إلغاء الكتم' : 'Unmute') : (isAr ? 'كتم' : 'Stumm')}
              active={isMuted}
              onClick={onToggleMute}
            />
            {type === 'video' && (
              <CallButton
                icon={isVideoOff ? VideoOff : Video}
                label={isVideoOff ? (isAr ? 'تشغيل الكاميرا' : 'Kamera an') : (isAr ? 'إيقاف الكاميرا' : 'Kamera aus')}
                active={isVideoOff}
                onClick={onToggleVideo}
              />
            )}
            <CallButton
              icon={isSpeaker ? Volume2 : VolumeX}
              label={isSpeaker ? (isAr ? 'سماعة الأذن' : 'Ohrhörer') : (isAr ? 'مكبر الصوت' : 'Lautsprecher')}
              active={isSpeaker}
              onClick={onToggleSpeaker}
            />
            <CallButton
              icon={PhoneOff}
              label={isAr ? 'إنهاء' : 'Auflegen'}
              danger
              large
              onClick={onHangUp}
            />
          </div>
        ) : (
          /* Outgoing/Connecting/Ended: Just hang up */
          <div className="flex items-center justify-center">
            <CallButton
              icon={PhoneOff}
              label={state === 'ended' ? (isAr ? 'إغلاق' : 'Schließen') : (isAr ? 'إلغاء' : 'Abbrechen')}
              danger
              large
              onClick={onHangUp}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default CallUI;

// ─────────────────────────────────────────────────────────────────────────────
// CallHistoryItem — A single call record in the calls tab.
// ─────────────────────────────────────────────────────────────────────────────
export interface CallRecord {
  id: string;
  participant: CallParticipant;
  type: CallType;
  direction: 'incoming' | 'outgoing';
  status: 'answered' | 'missed' | 'declined';
  duration: number; // seconds
  createdAt: string;
}

interface CallHistoryItemProps {
  call: CallRecord;
  isAr: boolean;
  onCall: (participant: CallParticipant, type: CallType) => void;
}

export const CallHistoryItem = React.memo(function CallHistoryItem({ call, isAr, onCall }: CallHistoryItemProps) {
  const defaultAvatar = getDefaultAvatarForUser(call.participant.username || '?');
  const isMissed = call.status === 'missed' || call.status === 'declined';
  const DirectionIcon = call.direction === 'incoming' ? PhoneIncoming : PhoneOutgoing;

  const timeStr = React.useMemo(() => {
    const d = new Date(call.createdAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return isAr ? 'أمس' : 'Gestern';
    if (diffDays < 7) return d.toLocaleDateString(isAr ? 'ar' : 'de', { weekday: 'short' });
    return d.toLocaleDateString(isAr ? 'ar' : 'de', { day: 'numeric', month: 'short' });
  }, [call.createdAt, isAr]);

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Avatar className="w-11 h-11 shrink-0">
        {call.participant.avatarUrl ? (
          <AvatarImage src={call.participant.avatarUrl} className="object-cover" />
        ) : (
          <img src={defaultAvatar} alt="" className="w-full h-full object-cover" />
        )}
        <AvatarFallback className="bg-muted">
          {(call.participant.username || '?')[0].toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-[14px] font-medium truncate',
          isMissed ? 'text-destructive' : 'text-foreground'
        )}>
          {call.participant.displayName || call.participant.username}
        </p>
        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <DirectionIcon className={cn('w-3 h-3', isMissed && 'text-destructive')} />
          <span>
            {isMissed
              ? (isAr ? 'لم يرد' : 'Verpasst')
              : formatCallDuration(call.duration)}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span>{timeStr}</span>
        </div>
      </div>

      {/* Re-call button */}
      <button
        type="button"
        onClick={() => onCall(call.participant, call.type)}
        className="w-9 h-9 rounded-full flex items-center justify-center text-primary active:bg-primary/10 transition-colors"
      >
        {call.type === 'video' ? <Video className="w-4.5 h-4.5" /> : <Phone className="w-4.5 h-4.5" />}
      </button>
    </div>
  );
});
