import { motion } from 'framer-motion';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { AppCard } from '@/components/ui/app-shell';
import { PageShell, Section } from '@/components/ui/app-shell';
import ResponsiveDrawer from '@/components/ui/ResponsiveDrawer';
import { useApp } from '@/contexts/AppContext';
import { AccountPrivacySection } from '@/features/account';
import { useAuth } from '@/hooks/useAuth';
import { useDraftStorage } from '@/hooks/useDraftStorage';
import { useNetworkToast } from '@/hooks/useNetworkStatus';
import {
  BookOpen,
  ChevronLeft,
  Gauge,
  LogOut,
  Palette,
  SlidersHorizontal,
  UserCircle,
} from '@/lib/icons';
import { pageItem as item, pageStagger as stagger } from '@/lib/motion';
import { getDefaultAvatarForUser } from '@/utils/defaultAvatar';
import { getAppleEmojiUrl, isEmojiAvatarValue } from '@/utils/emojiAvatar';

import packageJson from '../../package.json';

export default function SettingsPage() {
  const { t, theme, language, prayerMadhab } = useApp();
  const { user, username, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // ── Deep-Polish: Draft storage for settings form ─────────────────────
  // Auto-save settings form state for safety
  const [settingsDraft, setSettingsDraft, hasSettingsDraft] = useDraftStorage(
    `settings:draft:${user?.id || 'anon'}`,
    { theme, language, prayerMadhab },
    { ttl: 7 * 24 * 60 * 60 * 1000 }, // 7 days TTL
  );

  // ── Deep-Polish: Network toast notifications ─────────────────────────
  useNetworkToast({
    onlineMessage: 'تم استعادة الاتصال بالشبكة',
    offlineMessage: 'أنت غير متصل بالشبكة',
  });

  const handleSignOut = async () => {
    setShowLogoutConfirm(false);
    await signOut();
    toast.success('تم تسجيل الخروج');
    navigate('/', { replace: true });
  };

  const themeLabel = theme === 'dark' ? t('settings.dark') : t('settings.light');
  const madhabLabel = {
    shafii: 'الشافعي',
    hanafi: 'الحنفي',
    hanbali: 'الحنبلي',
    maliki: 'المالكي',
  }[prayerMadhab];

  // Grouped settings
  // Colour and type were two screens that could not show each other's effect.
  // They are now one — with geometry as its own screen next to it.
  const appearanceItems = [
    {
      key: 'appearance',
      icon: Palette,
      title: 'المظهر والألوان والخطوط',
      value: themeLabel,
      onClick: () => navigate('/settings/appearance'),
    },
    {
      key: 'interface',
      icon: SlidersHorizontal,
      title: 'الواجهة والأبعاد',
      value: '',
      onClick: () => navigate('/settings/interface'),
    },
    {
      key: 'motion',
      icon: Gauge,
      title: 'الحركة والأداء',
      value: '',
      onClick: () => navigate('/settings/motion'),
    },
  ];

  const prayerItems = [
    {
      key: 'prayer',
      icon: BookOpen,
      title: 'إعدادات الصلاة',
      value: madhabLabel,
      onClick: () => navigate('/settings/prayer'),
    },
  ];

  // Language now uses a segmented control (AR / DE) rendered separately
  // so both options remain visible and it's obvious which one is active.
  type SettingRow = {
    key: string;
    icon: React.ComponentType<React.ComponentProps<'svg'>>;
    title: string;
    value: string;
    onClick: () => void;
  };

  const renderGroup = (title: string, items: SettingRow[]) => (
    <motion.div variants={item}>
      <Section label={title}>
      <AppCard className="p-0 overflow-hidden divide-y divide-border/30">
        {items.map((si) => (
          <button
            key={si.key}
            onClick={si.onClick}
            className="flex items-center justify-between w-full px-4 py-3.5 active:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <si.icon className="w-[18px] h-[18px] text-primary stroke-[1.8]" />
              <span className="text-[0.875rem] font-medium text-foreground">{si.title}</span>
            </div>
            <div className="flex items-center gap-2">
              {si.value ? (
                <span className="text-[0.75rem] text-muted-foreground">{si.value}</span>
              ) : null}
              <ChevronLeft className="w-4 h-4 text-muted-foreground/40 ltr:rotate-180" />
            </div>
          </button>
        ))}
      </AppCard>
      </Section>
    </motion.div>
  );

  // Language picker retired — the app is Arabic-only.

  return (
    <PageShell className="pt-10">
      <SEO
        title="الإعدادات — SmartHub"
        description="تخصيص اللغة، السمة، الخط، حساب الصلاة والملف الشخصي في SmartHub."
        path="/settings"
      />
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="space-y-5 max-w-lg mx-auto"
      >
        {/* Header — settings is no longer a bottom-nav tab; the user
            reaches it from the avatar shortcut on Home, so we need a
            visible Back affordance to close the loop. */}
        <motion.div variants={item}>
          <PageHeader title={t('settings.title')} backTo="/" hideBack={false} />
        </motion.div>

        {/* Profile / Account Card */}
        <motion.div variants={item}>
          {loading ? (
            <AppCard className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-36 bg-muted animate-pulse rounded" />
                </div>
              </div>
            </AppCard>
          ) : user ? (
            <AppCard className="p-5">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <button
                  onClick={() => navigate('/profile')}
                  className="relative active:scale-95 transition-transform"
                >
                  <div className="w-14 h-14 rounded-full flex items-center justify-center ring-2 ring-primary/20 overflow-hidden">
                    {profile?.avatar_url && profile.avatar_url.startsWith('http') ? (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="w-full h-full object-cover object-top"
                      />
                    ) : profile?.avatar_url && isEmojiAvatarValue(profile.avatar_url) ? (
                      <img
                        src={getAppleEmojiUrl(profile.avatar_url) || ''}
                        alt=""
                        className="w-9 h-9"
                      />
                    ) : (
                      <img
                        src={getDefaultAvatarForUser(username || 'U')}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -end-0.5 w-4 h-4 rounded-full bg-primary border-2 border-card" />
                </button>

                {/* Info */}
                <button
                  onClick={() => navigate('/profile')}
                  className="flex-1 text-start active:opacity-70 transition-opacity min-w-0"
                >
                  <h2 className="text-[1.0625rem] font-bold text-foreground truncate">
                    {profile?.display_name || username || 'المستخدم'}
                  </h2>
                  {user.email ? (
                    <p className="text-[0.75rem] text-muted-foreground mt-0.5 truncate">
                      {user.email}
                    </p>
                  ) : null}
                  <p className="text-[0.6875rem] text-muted-foreground/70 mt-0.5 truncate">
                    @{username} · {'تعديل الملف الشخصي'}
                  </p>
                </button>

                {/* Logout */}
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="flex items-center gap-1.5 text-destructive/80 active:scale-90 transition-transform p-2"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </AppCard>
          ) : (
            <button
              onClick={() => navigate('/auth')}
              className="w-full active:scale-[0.99] transition-transform"
            >
              <AppCard className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/20">
                    <UserCircle className="w-7 h-7 text-primary stroke-[1.5]" />
                  </div>
                  <div className="flex-1 text-start">
                    <h2 className="text-[1.0625rem] font-bold text-foreground">{'تسجيل الدخول'}</h2>
                    <p className="text-[0.75rem] text-muted-foreground mt-0.5">
                      {'احفظ إعداداتك على جميع الأجهزة'}
                    </p>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-muted-foreground/40 ltr:rotate-180" />
                </div>
              </AppCard>
            </button>
          )}
        </motion.div>

        {/* Appearance Group */}
        {renderGroup('المظهر', appearanceItems)}

        {/* Prayer Group */}
        {renderGroup('الصلاة', prayerItems)}

        {/* Language picker retired — Arabic-only app. */}

        {/* Account & privacy — data export and erasure. Renders nothing
            when signed out or in local-only mode, where there is no
            server-side record to export or delete. */}
        <AccountPrivacySection appName="SmartHub" appVersion={packageJson.version} />

        {/* Version */}
        <motion.div variants={item} className="text-center pt-2 pb-4">
          <p className="text-[0.6875rem] text-muted-foreground/50">
            {'الإصدار'} {packageJson.version}
          </p>
        </motion.div>
      </motion.div>

      {/* Logout confirmation dialog */}
      <ResponsiveDrawer
        open={showLogoutConfirm}
        onOpenChange={setShowLogoutConfirm}
        title={'تسجيل الخروج'}
        description={
          'سيتم مسح جميع البيانات المحلية من هذا الجهاز. يمكنك استعادتها عند تسجيل الدخول مرة أخرى.'
        }
      >
        <div className="flex gap-3 pt-1">
          <button
            onClick={() => setShowLogoutConfirm(false)}
            className="flex-1 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium active:scale-[0.98] transition-transform"
          >
            {'إلغاء'}
          </button>
          <button
            onClick={handleSignOut}
            className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium active:scale-[0.98] transition-transform"
          >
            {'تسجيل خروج'}
          </button>
        </div>
      </ResponsiveDrawer>
    </PageShell>
  );
}
