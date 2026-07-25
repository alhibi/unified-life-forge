import { motion } from 'framer-motion';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import ErrorBoundary from '@/components/ErrorBoundary';
import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import {
  type ChatSettings as Settings,
getStorageReport,
  idbCache, useBlockedUsers, useChatMutations, useChats,
  useChatSettings, } from '@/lib/chat';
import {
  AlertTriangle, Bell, BellOff, CheckCircle2,
ChevronDown, Database, Download,   Eye, EyeOff, FileText, Globe, Image as ImageIcon, Mic,
Palette, RefreshCcw, RotateCcw,
  Send, ShieldOff, Smartphone, Trash2,   Type, Upload, Vibrate as VibrateIcon,
Volume2, } from '@/lib/icons';
import { pageItem as item,pageStagger as stagger } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { getDefaultAvatarForUser } from '@/utils/defaultAvatar';
import { getAppleEmojiUrl,isEmojiAvatarValue } from '@/utils/emojiAvatar';

/**
 * /chat/settings — comprehensive chat-specific preferences synced via
 * `user_settings.settings.chat`. Sections:
 *
 *   • Privacy            — last-seen / bio visibility, read receipts, typing
 *   • Notifications      — master + sounds + vibrate + desktop + quiet hours
 *   • Appearance         — font scale, density, default wallpaper, layout
 *   • Behavior           — enter-, emoji autocomplete, auto-download
 *   • Storage            — cache cap, retention, compression, live usage gauge
 *   • Blocked users      — list with unblock; opens block-someone via username
 *   • Backup & data      — export all chats as JSON
 *   • Danger zone        — clear local cache; reset chat settings to defaults
 *
 * Lives outside the chat drawer's layout so the user can deep-link
 * (`/chat/settings`) from anywhere in the app.
 */
export default function ChatSettingsPage() {
  const { } = useApp();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const cs = useChatSettings();
  const { blocked, isLoading: blockedLoading } = useBlockedUsers();
  const muts = useChatMutations(null);
  const { chats } = useChats();

  const [storageReport, setStorageReport] = useState<{ usageMb: number; quotaMb: number; capMb: number; capUsageRatio: number } | null>(null);
  const [busyClear, setBusyClear] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getStorageReport().then(r => { if (!cancelled) setStorageReport(r); });
    return () => { cancelled = true; };
  }, [cs.settings.storage.cacheCapMb, busyClear]);

  if (authLoading) return <Skeleton />;
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4">
        <h1 className="text-xl font-bold">{'سجّل الدخول'}</h1>
        <Button onClick={() => navigate('/auth')}>{'تسجيل الدخول'}</Button>
      </div>
    );
  }

  const handleClearCache = async () => {
    setBusyClear(true);
    try {
      await idbCache.clearAll();
      toast.success('تم مسح ذاكرة التخزين');
    } catch {
      toast.error('تعذّر المسح');
    } finally {
      setBusyClear(false);
    }
  };

  const handleExport = async () => {
    try {
      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        chats: chats.map(c => ({
          id: c.id, kind: c.kind, title: c.title,
          updatedAt: c.updatedAt, createdAt: c.createdAt,
          memberCount: c.memberCount, unreadCount: c.unreadCount,
          lastMessage: c.lastMessage,
        })),
        settings: cs.settings,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `smarthub-chat-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('تم التصدير');
    } catch {
      toast.error('تعذّر التصدير');
    }
  };

  return (
    <ErrorBoundary fallbackTitle={'حدث خطأ'}>
      <SEO
        title={'إعدادات المحادثات — SmartHub'}
        description={'الخصوصية، الإشعارات، التخزين والمظهر للدردشة.'}
        path="/chat/settings"
      />
      <div className="min-h-screen bg-background pb-page">
        <PageHeader
          title={'إعدادات المحادثات'}
          subtitle={'تطبَّق على جميع المحادثات'}
          backFallback="/chat"
          sticky
        />

        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="px-4 max-w-3xl mx-auto pt-3 space-y-5"
        >
          {/* Privacy */}
          <Section title={'الخصوصية'}>
            <Card>
              <SelectRow
                icon={cs.settings.privacy.lastSeenVisibility === 'nobody' ? <EyeOff /> : <Eye />}
                label={'آخر ظهور'}
                value={cs.settings.privacy.lastSeenVisibility}
                options={[
                  { value: 'everyone', labelAr: 'الكل', },
                  { value: 'contacts', labelAr: 'جهات الاتصال', },
                  { value: 'nobody', labelAr: 'لا أحد', },
                ]}
                onChange={(v) => cs.patchPrivacy({ lastSeenVisibility: v as Settings['privacy']['lastSeenVisibility'] })}
              />
              <SelectRow
                icon={<FileText />}
                label={'الوصف الشخصي (Bio)'}
                value={cs.settings.privacy.bioVisibility}
                options={[
                  { value: 'everyone', labelAr: 'الكل', },
                  { value: 'contacts', labelAr: 'جهات الاتصال', },
                  { value: 'nobody', labelAr: 'لا أحد', },
                ]}
                onChange={(v) => cs.patchPrivacy({ bioVisibility: v as Settings['privacy']['bioVisibility'] })}
              />
              <ToggleRow
                icon={<CheckCircle2 />}
                label={'إيصال القراءة'}
                description={'عند الإيقاف لن ترى متى يقرأ الآخرون رسائلك ولن يروا متى تقرأ رسائلهم.'}
                value={cs.settings.privacy.readReceipts}
                onChange={(v) => cs.patchPrivacy({ readReceipts: v })}
              />
              <ToggleRow
                icon={<Send />}
                label={'إظهار "يكتب الآن"'}
                value={cs.settings.privacy.showTyping}
                onChange={(v) => cs.patchPrivacy({ showTyping: v })}
              />
              <ToggleRow
                icon={<ShieldOff />}
                label={'حظر المستخدمين غير المعروفين'}
                description={'لن تتلقى رسائل من أشخاص ليسوا في جهات اتصالك.'}
                value={cs.settings.privacy.blockUnknownUsers}
                onChange={(v) => cs.patchPrivacy({ blockUnknownUsers: v })}
              />
            </Card>
          </Section>

          {/* Notifications */}
          <Section title={'الإشعارات'}>
            <Card>
              <ToggleRow
                icon={cs.settings.notifications.enabled ? <Bell /> : <BellOff />}
                label={'تفعيل الإشعارات'}
                value={cs.settings.notifications.enabled}
                onChange={(v) => cs.patchNotifications({ enabled: v })}
              />
              <ToggleRow
                icon={<Volume2 />}
                label={'الأصوات داخل التطبيق'}
                value={cs.settings.notifications.inAppSounds}
                onChange={(v) => cs.patchNotifications({ inAppSounds: v })}
                disabled={!cs.settings.notifications.enabled}
              />
              <ToggleRow
                icon={<VibrateIcon />}
                label={'الاهتزاز'}
                value={cs.settings.notifications.vibrate}
                onChange={(v) => cs.patchNotifications({ vibrate: v })}
                disabled={!cs.settings.notifications.enabled}
              />
              <ToggleRow
                icon={<Smartphone />}
                label={'إشعارات سطح المكتب'}
                value={cs.settings.notifications.desktop}
                onChange={(v) => cs.patchNotifications({ desktop: v })}
                disabled={!cs.settings.notifications.enabled}
              />
              <ToggleRow
                icon={<EyeOff />}
                label={'إخفاء محتوى الرسالة'}
                description={'يُظهر اسم المرسل فقط في الإشعار.'}
                value={cs.settings.notifications.hidePreview}
                onChange={(v) => cs.patchNotifications({ hidePreview: v })}
                disabled={!cs.settings.notifications.enabled}
              />
              <QuietHoursRow
                start={cs.settings.notifications.quietHoursStart}
                end={cs.settings.notifications.quietHoursEnd}
                onChange={(start, end) =>
                  cs.patchNotifications({ quietHoursStart: start, quietHoursEnd: end })}
                disabled={!cs.settings.notifications.enabled}
              />
            </Card>
          </Section>

          {/* Appearance */}
          <Section title={'المظهر'}>
            <Card>
              <SelectRow
                icon={<Type />}
                label={'حجم الخط'}
                value={cs.settings.appearance.fontScale}
                options={[
                  { value: 'small',   labelAr: 'صغير', },
                  { value: 'normal',  labelAr: 'عادي', },
                  { value: 'large',   labelAr: 'كبير', },
                  { value: 'xlarge',  labelAr: 'أكبر', },
                ]}
                onChange={(v) => cs.patchAppearance({ fontScale: v as Settings['appearance']['fontScale'] })}
              />
              <SelectRow
                icon={<Palette />}
                label={'الكثافة'}
                value={cs.settings.appearance.density}
                options={[
                  { value: 'compact',     labelAr: 'مدمج', },
                  { value: 'comfortable', labelAr: 'مريح', },
                  { value: 'cozy',        labelAr: 'فسيح', },
                ]}
                onChange={(v) => cs.patchAppearance({ density: v as Settings['appearance']['density'] })}
              />
              <ToggleRow
                icon={<ImageIcon />}
                label={'إظهار الصور الشخصية في المجموعات'}
                value={cs.settings.appearance.showAvatars}
                onChange={(v) => cs.patchAppearance({ showAvatars: v })}
              />
              <ToggleRow
                icon={<FileText />}
                label={'تجميع الفقاعات المتتالية'}
                value={cs.settings.appearance.groupBubbles}
                onChange={(v) => cs.patchAppearance({ groupBubbles: v })}
              />
              <ToggleRow
                icon={<Type />}
                label={'إظهار الوقت دائماً'}
                value={cs.settings.appearance.alwaysShowTime}
                onChange={(v) => cs.patchAppearance({ alwaysShowTime: v })}
              />
            </Card>
          </Section>

          {/* Behavior */}
          <Section title={'سلوك المحادثة'}>
            <Card>
              <ToggleRow
                icon={<Send />}
                label={'إرسال بضغطة Enter'}
                description={'استخدم Shift+Enter لسطر جديد.'}
                value={cs.settings.behavior.enterToSend}
                onChange={(v) => cs.patchBehavior({ enterToSend: v })}
              />
              <ToggleRow
                icon={<Globe />}
                label={'إكمال الرموز التعبيرية'}
                value={cs.settings.behavior.emojiAutoComplete}
                onChange={(v) => cs.patchBehavior({ emojiAutoComplete: v })}
              />
              <ToggleRow
                icon={<ImageIcon />}
                label={'تحميل الصور تلقائياً'}
                value={cs.settings.behavior.autoDownloadImages}
                onChange={(v) => cs.patchBehavior({ autoDownloadImages: v })}
              />
              <ToggleRow
                icon={<Mic />}
                label={'تحميل التسجيلات الصوتية تلقائياً'}
                value={cs.settings.behavior.autoDownloadVoice}
                onChange={(v) => cs.patchBehavior({ autoDownloadVoice: v })}
              />
              <ToggleRow
                icon={<FileText />}
                label={'تحميل الملفات تلقائياً'}
                value={cs.settings.behavior.autoDownloadFiles}
                onChange={(v) => cs.patchBehavior({ autoDownloadFiles: v })}
              />
              <SelectRow
                icon={<Globe />}
                label={'تنسيق الوقت'}
                value={cs.settings.behavior.use24h === null ? 'locale' : cs.settings.behavior.use24h ? '24h' : '12h'}
                options={[
                  { value: 'locale', labelAr: 'حسب اللغة', },
                  { value: '24h',    labelAr: '24 ساعة', },
                  { value: '12h',    labelAr: '12 ساعة', },
                ]}
                onChange={(v) =>
                  cs.patchBehavior({
                    use24h: v === 'locale' ? null : v === '24h',
                  })}
              />
            </Card>
          </Section>

          {/* Storage */}
          <Section title={'التخزين والبيانات'}>
            <Card>
              {storageReport && (
                <div className="px-4 py-3.5 border-b border-border/15">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-[12px] font-medium text-foreground">
                      {'الاستخدام الحالي'}
                    </span>
                    <span className="text-[12px] text-muted-foreground tabular-nums">
                      {storageReport.usageMb.toFixed(1)} {'م.ب'}
                      {storageReport.quotaMb > 0 && (
                        <> / {storageReport.quotaMb.toFixed(0)} {'م.ب'}</>
                      )}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-[width] duration-300"
                      style={{
                        width: `${Math.min(100, storageReport.quotaMb > 0
                          ? (storageReport.usageMb / storageReport.quotaMb) * 100
                          : 0)}%`,
                      }}
                    />
                  </div>
                </div>
              )}
              <NumberRow
                icon={<Database />}
                label={'سعة ذاكرة التخزين (م.ب)'}
                value={cs.settings.storage.cacheCapMb}
                min={0}
                max={2000}
                step={50}
                onChange={(v) => cs.patchStorage({ cacheCapMb: v })}
                helperAr="0 = بلا حد"
              />
              <NumberRow
                icon={<RotateCcw />}
                label={'الاحتفاظ بالرسائل (يوم)'}
                value={cs.settings.storage.cacheRetentionDays}
                min={0}
                max={365}
                step={5}
                onChange={(v) => cs.patchStorage({ cacheRetentionDays: v })}
                helperAr="0 = للأبد"
              />
              <NumberRow
                icon={<ImageIcon />}
                label={'حد الضغط للصور (م.ب)'}
                value={cs.settings.storage.compressThresholdMb}
                min={0}
                max={20}
                step={0.5}
                onChange={(v) => cs.patchStorage({ compressThresholdMb: v })}
                helperAr="0 = إيقاف الضغط"
              />
              <SelectRow
                icon={<ImageIcon />}
                label={'جودة الضغط'}
                value={String(cs.settings.storage.compressionQuality)}
                options={[
                  { value: '0.6',  labelAr: 'منخفضة (60%)', },
                  { value: '0.75', labelAr: 'متوسطة (75%)', },
                  { value: '0.82', labelAr: 'عالية (82%)', },
                  { value: '0.92', labelAr: 'ممتازة (92%)', },
                ]}
                onChange={(v) => cs.patchStorage({ compressionQuality: parseFloat(v) })}
              />
              <ActionRow
                icon={<Trash2 className="text-destructive" />}
                label={'مسح ذاكرة التخزين المؤقتة'}
                description={'يحذف الرسائل المخزّنة محلياً والصور المؤقتة. لن يحذف رسائلك من السيرفر.'}
                onClick={handleClearCache}
                disabled={busyClear}
                danger
              />
            </Card>
          </Section>

          {/* Blocked users */}
          <Section title={'المستخدمون المحظورون'}>
            <Card>
              {blockedLoading ? (
                <SkeletonRow />
              ) : blocked.length === 0 ? (
                <div className="px-4 py-6 text-center text-[13px] text-muted-foreground">
                  {'لا يوجد مستخدمون محظورون'}
                </div>
              ) : (
                blocked.map(b => {
                  const isEmoji = b.avatarUrl ? isEmojiAvatarValue(b.avatarUrl) : false;
                  const hasImage = b.avatarUrl && b.avatarUrl.startsWith('http');
                  return (
                    <div key={b.blockedId} className="flex items-center gap-3 px-4 py-3 border-b border-border/10 last:border-b-0">
                      <Avatar className="h-9 w-9 shrink-0">
                        {hasImage
                          ? <AvatarImage src={b.avatarUrl!} className="object-cover" />
                          : isEmoji
                            ? <AvatarImage src={getAppleEmojiUrl(b.avatarUrl!) || ''} className="w-[60%] h-[60%] object-contain m-auto" />
                            : <img src={getDefaultAvatarForUser(b.username || b.blockedId)} alt="" className="w-full h-full object-cover" />}
                        <AvatarFallback className="bg-muted" />
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-foreground truncate">
                          {b.displayName || b.username || b.blockedId.slice(0, 6)}
                        </p>
                        {b.username && b.displayName && b.displayName !== b.username && (
                          <p className="text-[11px] text-muted-foreground truncate">@{b.username}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[12px] text-primary hover:bg-primary/10"
                        onClick={() => muts.unblockUser(b.blockedId)}
                      >
                        {'فك الحظر'}
                      </Button>
                    </div>
                  );
                })
              )}
            </Card>
          </Section>

          {/* Backup */}
          <Section title={'النسخ الاحتياطي'}>
            <Card>
              <ActionRow
                icon={<Download />}
                label={'تصدير المحادثات (JSON)'}
                description={'يصدّر قائمة محادثاتك وإعداداتك لاستيرادها في جهاز آخر.'}
                onClick={handleExport}
              />
              <ActionRow
                icon={<Upload />}
                label={'استيراد (قريباً)'}
                description={'سيكون متاحاً في تحديث لاحق.'}
                onClick={() => toast.info('قريباً')}
                disabled
              />
            </Card>
          </Section>

          {/* Danger zone */}
          <Section title={'إجراءات متقدّمة'}>
            <Card variant="danger">
              <ActionRow
                icon={<RefreshCcw className="text-destructive" />}
                label={'إعادة تعيين كل الإعدادات'}
                description={'تُعاد كل خيارات الدردشة إلى الافتراضي. لن تتأثر الرسائل أو المحادثات.'}
                onClick={() => {
                  cs.resetToDefaults();
                  toast.success('تمت إعادة التعيين');
                }}
                danger
              />
            </Card>
          </Section>

          <p className="text-[10px] text-muted-foreground/60 text-center pt-2 px-4 leading-relaxed">
            <AlertTriangle className="inline w-3 h-3 me-1 -mt-0.5" />
            {'هذه الإعدادات تُحفظ تلقائياً وتُزامَن عبر أجهزتك.'}
          </p>
        </motion.div>
      </div>
    </ErrorBoundary>
  );
}

// ── Reusable building blocks ────────────────────────────────────────────────

interface SectionProps { title: string; children: React.ReactNode }
function Section({ title, children }: SectionProps) {
  return (
    <motion.div variants={item} className="space-y-2">
      <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-1">
        {title}
      </p>
      {children}
    </motion.div>
  );
}

interface CardProps { children: React.ReactNode; variant?: 'default' | 'danger' }
function Card({ children, variant }: CardProps) {
  return (
    <div className={cn(
      'rounded-2xl overflow-hidden divide-y',
      variant === 'danger'
        ? 'bg-destructive/5 border border-destructive/15 divide-destructive/10'
        : 'bg-card border border-border/40 divide-border/30',
    )}>
      {children}
    </div>
  );
}

interface ToggleRowProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}
function ToggleRow({ icon, label, description, value, onChange, disabled }: ToggleRowProps) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3 active:bg-muted/30 transition-colors text-start',
        disabled && 'opacity-60 cursor-not-allowed',
      )}
    >
      <span className="shrink-0 mt-0.5 text-primary [&>svg]:w-[18px] [&>svg]:h-[18px] [&>svg]:stroke-[1.7]">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-[11px] text-muted-foreground/80 mt-0.5 leading-snug">{description}</p>
        )}
      </div>
      <span
        className={cn(
          'w-[44px] h-[24px] rounded-full transition-colors duration-200 relative shrink-0 mt-0.5',
          value ? 'bg-primary' : 'bg-muted',
 )}
 dir="ltr"
 >
 <motion.span
 className="absolute top-[2px] h-[20px] w-[20px] rounded-full bg-primary-foreground"
 initial={false}
 animate={{ left: value ? 22 : 2 }}
 transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        />
      </span>
    </button>
  );
}

interface SelectRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  options: Array<{ value: string; labelAr: string; }>;
  onChange: (next: string) => void;
}
function SelectRow({ icon, label, value, options, onChange, }: SelectRowProps) {
  const current = options.find(o => o.value === value) ?? options[0];
  return (
    <div className="relative">
      <div className="w-full flex items-center gap-3 px-4 py-3">
        <span className="shrink-0 text-primary [&>svg]:w-[18px] [&>svg]:h-[18px] [&>svg]:stroke-[1.7]">
          {icon}
        </span>
        <span className="flex-1 text-[14px] font-medium text-foreground">{label}</span>
        <span className="text-[12px] text-muted-foreground inline-flex items-center gap-1">
          {current.labelAr}
          <ChevronDown className="w-3.5 h-3.5" />
        </span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer"
          aria-label={label}
        >
          {options.map(o => (
            <option key={o.value} value={o.value}>
              {o.labelAr}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

interface NumberRowProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  min: number; max: number; step: number;
  onChange: (v: number) => void;
  helperAr?: string;
}
function NumberRow({ icon, label, value, min, max, step, onChange, helperAr }: NumberRowProps) {
  const { } = useApp();
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3 mb-2">
        <span className="shrink-0 text-primary [&>svg]:w-[18px] [&>svg]:h-[18px] [&>svg]:stroke-[1.7]">{icon}</span>
        <span className="flex-1 text-[14px] font-medium text-foreground">{label}</span>
        <span className="text-[12px] text-muted-foreground tabular-nums min-w-[2ch] text-end">{value}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
      {helperAr && (
        <p className="text-[10px] text-muted-foreground/70 mt-1">
          {helperAr}
        </p>
      )}
    </div>
  );
}

interface ActionRowProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}
function ActionRow({ icon, label, description, onClick, disabled, danger }: ActionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3 active:bg-muted/30 transition-colors text-start',
        disabled && 'opacity-60 cursor-not-allowed',
      )}
    >
      <span
        className={cn(
          'shrink-0 mt-0.5 [&>svg]:w-[18px] [&>svg]:h-[18px] [&>svg]:stroke-[1.7]',
          danger ? 'text-destructive' : 'text-primary',
        )}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-[14px] font-medium',
          danger ? 'text-destructive' : 'text-foreground',
        )}>
          {label}
        </p>
        {description && (
          <p className="text-[11px] text-muted-foreground/80 mt-0.5 leading-snug">{description}</p>
        )}
      </div>
    </button>
  );
}

interface QuietHoursRowProps {
  start: number | null;
  end: number | null;
  onChange: (start: number | null, end: number | null) => void;
  disabled?: boolean;
}
function QuietHoursRow({ start, end, onChange, disabled }: QuietHoursRowProps) {
  const enabled = start !== null && end !== null;
  return (
    <div className={cn('px-4 py-3', disabled && 'opacity-60')}>
      <div className="flex items-center gap-3 mb-2">
        <span className="shrink-0 text-primary"><BellOff className="w-[18px] h-[18px] stroke-[1.7]" /></span>
        <span className="flex-1 text-[14px] font-medium text-foreground">
          {'وضع الهدوء'}
        </span>
        <button
          type="button"
          onClick={() => onChange(enabled ? null : 22, enabled ? null : 7)}
          disabled={disabled}
          className={cn(
            'w-[44px] h-[24px] rounded-full transition-colors relative shrink-0',
            enabled ? 'bg-primary' : 'bg-muted',
          )}
          dir="ltr"
          aria-label={'تفعيل وضع الهدوء'}
 >
 <motion.span
 className="absolute top-[2px] h-[20px] w-[20px] rounded-full bg-primary-foreground"
 initial={false}
 animate={{ left: enabled ? 22 : 2 }}
 transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          />
        </button>
      </div>
      {enabled && (
        <div className="flex items-center gap-2 mt-2">
          <HourPicker
            label={'من'}
            value={start ?? 22}
            onChange={(v) => onChange(v, end ?? 7)}
          />
          <HourPicker
            label={'إلى'}
            value={end ?? 7}
            onChange={(v) => onChange(start ?? 22, v)}
          />
        </div>
      )}
    </div>
  );
}

function HourPicker({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex-1 flex items-center gap-2 bg-muted/30 rounded-xl px-3 h-9">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="bg-transparent text-[13px] outline-none flex-1"
      >
        {Array.from({ length: 24 }, (_, h) => (
          <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
        ))}
      </select>
    </label>
  );
}

function SkeletonRow() {
  return (
    <div className="space-y-2 p-3">
      {[0, 1, 2].map(i => (
        <div key={i} className="flex items-center gap-3 py-2">
          <div className="skeleton h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <div className="skeleton h-3 w-24 rounded" />
            <div className="skeleton h-2.5 w-16 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="min-h-screen p-4 space-y-4">
      <div className="skeleton h-12 w-2/3 rounded-2xl" />
      {[0, 1, 2, 3].map(i => (
        <div key={i} className="space-y-2">
          <div className="skeleton h-3 w-24 rounded" />
          <div className="skeleton h-44 w-full rounded-2xl" />
        </div>
      ))}
    </div>
  );
}
