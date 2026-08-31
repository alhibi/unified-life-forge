/**
 * Profile Vision Card — Deep Enhanced Design Component
 * ----------------------------------------------------
 * A luxury identity card displaying profile identity, privacy state,
 * and customization status with deep visual hierarchy and motion.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Eye, EyeOff, Palette, Sparkles } from '@/lib/icons';
import { PrivacySettings } from '../types';
import type { ProfileData } from '../lib/profileCompletionEngine';

interface ProfileVisionCardProps {
  profile: ProfileData;
  privacySettings: PrivacySettings;
  isPublic: boolean;
  className?: string;
}

export function ProfileVisionCard({ profile, privacySettings, isPublic, className = '' }: ProfileVisionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55 }}
      className={`surface-depth rounded-[1.75rem] overflow-hidden relative ${className}`}
    >
      {/* Background decorative gradient based on cover theme */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-900/20 via-slate-950 to-black" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-amber-900/5" />
      <div className="absolute top-0 left-0 w-48 h-48 rounded-full bg-gradient-to-br from-violet-500/10 to-transparent blur-3xl -translate-x-1/3 -translate-y-1/4" />

      <div className="relative z-10 p-6 md:p-8">
        {/* Top row: Identity + Privacy */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-3xl overflow-hidden ring-2 ring-violet-400/20 shadow-xl shadow-violet-900/20">
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-violet-600/20 to-fuchsia-600/10 flex items-center justify-center">
                  <span className="text-2xl font-extrabold text-violet-300/60">{profile.displayName?.[0] || '?'}</span>
                </div>
              )}
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">{profile.displayName}</h2>
              <p className="text-[0.75rem] text-violet-200/60 font-medium">{profile.username}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 rounded-full text-[0.65rem] font-extrabold ${isPublic ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/20' : 'bg-slate-700/30 text-slate-400 border border-white/5'}`}>
              {isPublic ? 'عام' : 'خاص'}
            </span>
          </div>
        </div>

        {/* Bio / Title */}
        <div className="mb-6">
          <p className="text-[0.85rem] text-violet-100/80 font-medium leading-relaxed">{profile.bio || 'نبذة شخصية لم تُضف بعد.'}</p>
          <div className="mt-3 flex items-center gap-2 text-[0.7rem] text-violet-300/40 font-medium">
            <Palette className="w-3.5 h-3.5" />
            <span>{profile.coverThemeId}</span>
          </div>
        </div>

        {/* Privacy badges */}
        <div className="flex flex-wrap gap-2">
          {[
            { active: privacySettings.hide_activity, label: 'أنشطة مخفية', Icon: Shield },
            { active: privacySettings.hide_location, label: 'موقع مخفي', Icon: EyeOff },
            { active: privacySettings.hide_online_status, label: 'حالة مخفية', Icon: Eye },
            { active: isPublic, label: 'ملف عام', Icon: Sparkles },
          ].filter(s => s.active).map(s => (
            <span key={s.label} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.625rem] font-extrabold bg-white/[0.05] text-violet-200/70 border border-white/[0.08]">
              <s.Icon className="w-3 h-3" />
              {s.label}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
