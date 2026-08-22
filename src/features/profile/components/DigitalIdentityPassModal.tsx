import { AnimatePresence, motion } from 'framer-motion';
import React, { useMemo } from 'react';
import { toast } from 'sonner';

import { useUnifiedStreakDays } from '@/features/profile/lib/streakStore';
import {
  Copy,
  Download,
  ShieldCheck,
  Sparkles,
  X,
} from '@/lib/icons';
import { getDefaultAvatarForUser } from '@/utils/defaultAvatar';
import { getAppleEmojiUrl, isEmojiAvatarValue } from '@/utils/emojiAvatar';

export interface DigitalIdentityPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  displayName: string;
  avatarUrl: string;
  title?: string | null;
  location?: string | null;
  memberSinceDate?: string | null;
}

export const DigitalIdentityPassModal: React.FC<DigitalIdentityPassModalProps> = ({
  isOpen,
  onClose,
  username,
  displayName,
  avatarUrl,
  title = 'عضو نخبة الهدوء',
  location: _location,
  memberSinceDate: _memberSinceDate = '2026',
}) => {
  // All hooks BEFORE any early return (Rules of Hooks).
  const unifiedStreakDays = useUnifiedStreakDays();

  // Generate 8x8 SVG matrix to represent a crisp vector QR code
  const qrMatrix = useMemo(() => {
    const seed = (username || 'user').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const grid = [];
    for (let row = 0; row < 8; row++) {
      const rowArr = [];
      for (let col = 0; col < 8; col++) {
        const isCorner =
          (row < 2 && col < 2) ||
          (row < 2 && col > 5) ||
          (row > 5 && col < 2);
        const fill = isCorner || ((row * 8 + col + seed) % 3 === 0);
        rowArr.push(fill);
      }
      grid.push(rowArr);
    }
    return grid;
  }, [username]);

  if (!isOpen) return null;

  const serialNumber = `#ZE-${(username || 'anon').toUpperCase()}-2026`;
  const isUrlAvatar = avatarUrl && avatarUrl.startsWith('http');
  const isEmojiAvatar = avatarUrl && isEmojiAvatarValue(avatarUrl);

  const profileUrl = `${window.location.origin}/u/${(username || 'user').toLowerCase()}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      toast.success('تم نسخ رابط بطاقة الهوية الرقمية');
    } catch {
      toast.error('تعذر نسخ الرابط');
    }
  };

  const handleDownloadPass = async () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 760;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Dark Zen luxury background
      ctx.fillStyle = '#121212';
      ctx.fillRect(0, 0, 600, 760);

      // Gold / primary accent border
      ctx.strokeStyle = '#E45B60';
      ctx.lineWidth = 6;
      ctx.strokeRect(16, 16, 568, 728);

      // Header text
      ctx.fillStyle = '#E45B60';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ZEN ELITE DIGITAL IDENTITY PASS', 300, 70);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'extrabold 32px sans-serif';
      ctx.fillText('بطاقة العضوية الرقمية', 300, 120);

      // Serial Number
      ctx.fillStyle = '#A1A1AA';
      ctx.font = '18px monospace';
      ctx.fillText(serialNumber, 300, 160);

      // Card Inner Surface
      ctx.fillStyle = '#1E1E1E';
      ctx.roundRect(40, 190, 520, 420, 24);
      ctx.fill();

      // Display name
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText(displayName, 300, 310);

      // Username
      ctx.fillStyle = '#E45B60';
      ctx.font = '22px monospace';
      ctx.fillText(`@${username}`, 300, 350);

      // Title
      ctx.fillStyle = '#D4D4D8';
      ctx.font = '20px sans-serif';
      ctx.fillText(title || 'عضو نخبة الهدوء', 300, 390);

      // Verification Badge
      ctx.fillStyle = '#34D399';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText('✓ VERIFIED MEMBER • LIFETIME PASS', 300, 440);

      // QR Code Box Placeholder on Canvas
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(240, 480, 120, 120);

      // Draw QR Matrix pixels
      ctx.fillStyle = '#000000';
      const cellSize = 15;
      qrMatrix.forEach((row, rIdx) => {
        row.forEach((filled, cIdx) => {
          if (filled) {
            ctx.fillRect(240 + cIdx * cellSize, 480 + rIdx * cellSize, cellSize, cellSize);
          }
        });
      });

      // Commitment streak line
      ctx.fillStyle = '#F59E0B';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(`🔥 سلسلة الالتزام: ${unifiedStreakDays ?? 0}`, 300, 640);

      // Footer
      ctx.fillStyle = '#71717A';
      ctx.font = '16px sans-serif';
      ctx.fillText('الهدوء والإنتاجية العالية • Zen Elite Architecture 2026', 300, 680);

      const dataUri = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUri;
      a.download = `Pass_${username || 'Zen'}.png`;
      a.click();
      toast.success('تم تصدير بطاقة الهوية الرقمية بنجاح');
    } catch {
      toast.error('تعذر تصدير البطاقة');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
        onClick={onClose}
        dir="rtl"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 350, damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-sm rounded-3xl overflow-hidden bg-card border border-border/80 shadow-2xl relative space-y-4 p-6"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 end-4 w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Art Ticket Pass Header */}
          <div className="text-center space-y-1">
            <span className="text-micro font-mono tracking-widest text-primary uppercase font-bold">
              ZEN ELITE DIGITAL IDENTITY
            </span>
            <h2 className="text-lead font-extrabold text-foreground">بطاقة العضوية الرقمية</h2>
          </div>

          {/* Physical Art Ticket Container */}
          <div className="surface-depth rounded-2xl p-5 border border-primary/20 relative overflow-hidden space-y-4 bg-gradient-to-b from-card via-card to-background">
            {/* Background SVG Watermark */}
            <div className="absolute -end-10 -bottom-10 opacity-5 pointer-events-none text-primary">
              <Sparkles className="w-40 h-40" />
            </div>

            {/* Ticket Top Row: Serial & Seal */}
            <div className="flex items-center justify-between text-micro font-mono border-b border-border/40 pb-2">
              <span className="text-muted-foreground">{serialNumber}</span>
              <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                VERIFIED PASS
              </span>
            </div>

            {/* User Identity Info */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full ring-2 ring-primary bg-card overflow-hidden shrink-0 flex items-center justify-center shadow-md">
                {isUrlAvatar ? (
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : isEmojiAvatar ? (
                  <img src={getAppleEmojiUrl(avatarUrl) || ''} alt={displayName} className="w-10 h-10" />
                ) : (
                  <img
                    src={getDefaultAvatarForUser(username || 'U')}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-0.5">
                <h3 className="text-meta font-extrabold text-foreground truncate">{displayName}</h3>
                <p className="text-micro font-mono text-muted-foreground" dir="ltr">
                  @{username}
                </p>
                <p className="text-micro font-semibold text-primary">{title || 'عضو نخبة الهدوء'}</p>
              </div>
            </div>

            {/* Commitment Streak Row — real unified streak */}
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-500/[0.07] border border-amber-500/20">
              <span className="text-micro font-semibold text-muted-foreground">
                سلسلة الالتزام المتواصلة
              </span>
              <span className="inline-flex items-center gap-1.5 text-mini font-black text-amber-400 tabular-nums">
                🔥 {unifiedStreakDays ?? 0}
                <span className="text-micro font-bold text-muted-foreground">
                  {(unifiedStreakDays ?? 0) === 1 ? 'يوم' : 'أيام'}
                </span>
              </span>
            </div>

            {/* Simulated Dynamic Vector QR Code & Barcode Ticket Edge */}
            <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-3">
              <div className="space-y-1">
                <span className="block text-micro font-mono text-muted-foreground">SCAN OR SHARE LINK</span>
                <span className="block text-micro font-bold text-white/90 truncate max-w-[160px]" dir="ltr">
                  {profileUrl}
                </span>
                <span className="block text-micro text-muted-foreground">عضوية صالحة مدى الحياة</span>
              </div>

              {/* Vector QR Matrix SVG */}
              <div className="w-12 h-12 rounded-lg bg-white p-1 shrink-0 flex items-center justify-center shadow-md">
                <svg viewBox="0 0 8 8" className="w-10 h-10 text-black fill-current">
                  {qrMatrix.map((row, rIdx) =>
                    row.map((filled, cIdx) =>
                      filled ? (
                        <rect key={`${rIdx}-${cIdx}`} x={cIdx} y={rIdx} width="1" height="1" />
                      ) : null
                    )
                  )}
                </svg>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleDownloadPass}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-mini font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-md"
            >
              <Download className="w-4 h-4" />
              تحميل البطاقة
            </button>
            <button
              onClick={handleCopyLink}
              className="py-2.5 px-3 rounded-xl bg-secondary text-secondary-foreground text-mini font-semibold flex items-center justify-center gap-1 hover:bg-secondary/80 transition-colors"
              title="نسخ الرابط"
            >
              <Copy className="w-4 h-4" />
              <span className="hidden sm:inline">نسخ</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2.5 rounded-xl bg-muted/40 text-muted-foreground text-mini font-semibold hover:text-foreground transition-colors"
            >
              إغلاق
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
