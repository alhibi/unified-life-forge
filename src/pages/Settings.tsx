import { motion } from 'framer-motion';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { AppCard, AppList, AppRow, PageShell, Section } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import ResponsiveDrawer from '@/components/ui/ResponsiveDrawer';
import { useApp } from '@/contexts/AppContext';
import { AccountPrivacySection } from '@/features/account';
import { useAuth } from '@/hooks/useAuth';
import { useNetworkToast } from '@/hooks/useNetworkStatus';
import {
  BookOpen,
  ChevronLeft,
  Gauge,
  Keyboard,
  LogOut,
  Palette,
  RotateCcw,
  SlidersHorizontal,
  UserCircle,
} from '@/lib/icons';
import { pageItem as item, pageStagger as stagger } from '@/lib/motion';
import { getDefaultAvatarForUser } from '@/utils/defaultAvatar';
import { getAppleEmojiUrl, isEmojiAvatarValue } from '@/utils/emojiAvatar';

import packageJson from '../../package.json';

const UI_DENSITY_LABELS: Record<string, string> = {
  compact: 'مضغوط',
  cozy: 'متوازن',
  comfortable: 'مريح',
};

const MADHAB_LABELS: Record<string, string> = {
  shafii: 'الشافعي',
  hanafi: 'الحنفي',
  hanbali: 'الحنبلي',
  maliki: 'المالكي',
};

/** The motion row opens the motion platform — the speed multiplier is the
 *  one value a passer-by can act on, so it doubles as the summary. */
function motionSummary(speed: number): string {
  return Math.abs(speed - 1) < 0.01 ? 'طبيعية' : `${speed}×`;
}

export default function SettingsPage() {
  const { t, theme, uiDensity, prayerMadhab, motionSpeed, resetToDefaults } = useApp();
  const { user, username, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // ── Network toast notifications ────────────────────────────────────────
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

  const handleResetDefaults = () => {
    setShowResetConfirm(false);
    resetToDefaults();
    toast.success('تم استعادة الإعدادات الافتراضية');
  };

  const themeLabel = theme === 'dark' ? t('settings.dark') : t('settings.light');
  const densityLabel = UI_DENSITY_LABELS[uiDensity as keyof typeof UI_DENSITY_LABELS] ?? '';
  const madhabLabel = MADHAB_LABELS[prayerMadhab];

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
      value: densityLabel,
      onClick: () => navigate('/settings/interface'),
    },
    {
      key: 'keyboard',
      icon: Keyboard,
      title: 'لوحة المفاتيح والإدخال',
      value: 'لوحة التطبيق',
      onClick: () => navigate('/settings/keyboard'),
    },
    {
      key: 'motion',
      icon: Gauge,
      title: 'الحركة والأداء',
      value: motionSummary(motionSpeed),
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
        <AppList>
          {items.map((si) => (
            <AppRow
              key={si.key}
              onClick={si.onClick}
              leading={<si.icon className="h-5 w-5 text-primary" aria-hidden />}
              title={si.title}
              value={si.value}
              chevron
            />
          ))}
        </AppList>
      </Section>
    </motion.div>
  );

  return (
    <PageShell className="pt-10">
      <SEO
        title="الإعدادات — SmartHub"
        description="تخصيص المظهر والواجهة والحركة ولوحة المفاتيح وإعدادات الصلاة والخصوصية في SmartHub."
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
                  aria-label="تعديل الملف الشخصي"
                  className="relative"
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
                  className="flex-1 text-start min-w-0"
                >
                  <h2 className="text-body font-bold text-foreground truncate">
                    {profile?.display_name || username || 'المستخدم'}
                  </h2>
                  {user.email ? (
                    <p className="text-mini text-muted-foreground mt-0.5 truncate">
                      {user.email}
                    </p>
                  ) : null}
                  <p className="text-micro text-muted-foreground-subtle mt-0.5 truncate">
                    @{username} · {'تعديل الملف الشخصي'}
                  </p>
                </button>

                {/* Logout */}
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  aria-label="تسجيل الخروج"
                  className="flex items-center gap-1.5 text-destructive p-2 rounded-md"
                >
                  <LogOut className="w-4 h-4" aria-hidden />
                </button>
              </div>
            </AppCard>
          ) : (
            <button onClick={() => navigate('/auth')} className="w-full text-start">
              <AppCard className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/20">
                    <UserCircle className="w-7 h-7 text-primary" />
                  </div>
                  <div className="flex-1 text-start">
                    <h2 className="text-body font-bold text-foreground">{'تسجيل الدخول'}</h2>
                    <p className="text-mini text-muted-foreground mt-0.5">
                      {'احفظ إعداداتك على جميع الأجهزة'}
                    </p>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-muted-foreground-subtle" aria-hidden />
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

        {/* Restore defaults — every preference this provider owns returns to
            its factory value (including traveling feature settings). */}
        <motion.div variants={item}>
          <AppList>
            <AppRow
              onClick={() => setShowResetConfirm(true)}
              leading={<RotateCcw className="h-5 w-5 text-muted-foreground" aria-hidden />}
              title="استعادة الإعدادات الافتراضية"
            />
          </AppList>
        </motion.div>

        {/* Account & privacy — data export and erasure. Renders nothing
            when signed out or in local-only mode, where there is no
            server-side record to export or delete. */}
        <AccountPrivacySection appName="SmartHub" appVersion={packageJson.version} />

        {/* Version */}
        <motion.div variants={item} className="text-center pt-2 pb-4">
          <p className="text-micro text-muted-foreground-subtle">
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
          <Button variant="secondary" className="flex-1" onClick={() => setShowLogoutConfirm(false)}>
            {'إلغاء'}
          </Button>
          <Button variant="destructive" className="flex-1" onClick={handleSignOut}>
            {'تسجيل خروج'}
          </Button>
        </div>
      </ResponsiveDrawer>

      {/* Restore-defaults confirmation dialog */}
      <ResponsiveDrawer
        open={showResetConfirm}
        onOpenChange={setShowResetConfirm}
        title={'استعادة الإعدادات الافتراضية'}
        description={
          'ستعود جميع التفضيلات — المظهر والواجهة والحركة والصلاة — إلى قيمها الأصلية على هذا الجهاز. لن تُحذف بياناتك المحفوظة: المدن والمواقع والإحصائيات وتقدّم القراءة.'
        }
      >
        <div className="flex gap-3 pt-1">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setShowResetConfirm(false)}
          >
            {'إلغاء'}
          </Button>
          <Button variant="destructive" className="flex-1" onClick={handleResetDefaults}>
            {'استعادة'}
          </Button>
        </div>
      </ResponsiveDrawer>
    </PageShell>
  );
}
