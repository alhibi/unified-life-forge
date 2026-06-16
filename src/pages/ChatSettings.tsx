import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, Bell, BellOff, Smartphone, Volume2, Vibrate as VibrateIcon,
  Type, Palette, RefreshCcw, Database, Image as ImageIcon, FileText, Mic,
  Send, Globe, ShieldOff, Trash2, Download, Upload, CheckCircle2,
  AlertTriangle, ChevronDown, RotateCcw,
} from '@/lib/icons';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import SEO from '@/components/SEO';
import PageHeader from '@/components/PageHeader';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import {
  useChatSettings, useBlockedUsers, useChatMutations, useChats,
  idbCache, getStorageReport,
  type ChatSettings as Settings,
} from '@/lib/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { isEmojiAvatarValue, getAppleEmojiUrl } from '@/utils/emojiAvatar';
import { getDefaultAvatarForUser } from '@/utils/defaultAvatar';

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

/**
 * /chat/settings — comprehensive chat-specific preferences synced via
 * `user_settings.settings.chat`. Sections:
 *
 *   • Privacy            — last-seen / bio visibility, read receipts, typing
 *   • Notifications      — master + sounds + vibrate + desktop + quiet hours
 *   • Appearance         — font scale, density, default wallpaper, layout
 *   • Behavior           — enter-to-send, emoji autocomplete, auto-download
 *   • Storage            — cache cap, retention, compression, live usage gauge
 *   • Blocked users      — list with unblock; opens block-someone via username
 *   • Backup & data      — export all chats as JSON
 *   • Danger zone        — clear local cache; reset chat settings to defaults
 *
 * Lives outside the chat drawer's layout so the user can deep-link
 * (`/chat/settings`) from anywhere in the app.
 */
export default function ChatSettingsPage() {
  const { language } = useApp();
  const isAr = language === 'ar';
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
        <h1 className="text-xl font-bold">{isAr ? 'سجّل الدخول' : 'Anmeldung erforderlich'}</h1>
        <Button onClick={() => navigate('/auth')}>{isAr ? 'تسجيل الدخول' : 'Anmelden'}</Button>
      </div>
    );
  }

  const handleClearCache = async () => {
    setBusyClear(true);
    try {
      await idbCache.clearAll();
      toast.success(isAr ? 'تم مسح ذاكرة التخزين' : 'Zwischenspeicher geleert');
    } catch {
      toast.error(isAr ? 'تعذّر المسح' : 'Fehlgeschlagen');
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
      toast.success(isAr ? 'تم التصدير' : 'Export gestartet');
    } catch {
      toast.error(isAr ? 'تعذّر التصدير' : 'Export fehlgeschlagen');
    }
  };

  return (
    <ErrorBoundary fallbackTitle={isAr ? 'حدث خطأ' : 'Fehler'}>
      <SEO
        title={isAr ? 'إعدادات المحادثات — SmartHub' : 'Chat-Einstellungen — SmartHub'}
        description={isAr ? 'الخصوصية، الإشعارات، التخزين والمظهر للدردشة.' : 'Privatsphäre, Benachrichtigungen, Speicher.'}
        path="/chat/settings"
      />
      <div className="min-h-screen bg-background pb-24">
        <PageHeader
          title={isAr ? 'إعدادات المحادثات' : 'Chat-Einstellungen'}
          subtitle={isAr ? 'تطبَّق على جميع المحادثات' : 'Gilt für alle Chats'}
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
          <Section title={isAr ? 'الخصوصية' : 'Privatsphäre'}>
            <Card>
              <SelectRow
                icon={cs.settings.privacy.lastSeenVisibility === 'nobody' ? <EyeOff /> : <Eye />}
                label={isAr ? 'آخر ظهور' : 'Zuletzt online'}
                value={cs.settings.privacy.lastSeenVisibility}
                options={[
                  { value: 'everyone', labelAr: 'الكل', labelDe: 'Alle' },
                  { value: 'contacts', labelAr: 'جهات الاتصال', labelDe: 'Kontakte' },
                  { value: 'nobody', labelAr: 'لا أحد', labelDe: 'Niemand' },
                ]}
                onChange={(v) => cs.patchPrivacy({ lastSeenVisibility: v as Settings['privacy']['lastSeenVisibility'] })}
                isAr={isAr}
              />
              <SelectRow
                icon={<FileText />}
                label={isAr ? 'الوصف الشخصي (Bio)' : 'Bio-Sichtbarkeit'}
                value={cs.settings.privacy.bioVisibility}
                options={[
                  { value: 'everyone', labelAr: 'الكل', labelDe: 'Alle' },
                  { value: 'contacts', labelAr: 'جهات الاتصال', labelDe: 'Kontakte' },
                  { value: 'nobody', labelAr: 'لا أحد', labelDe: 'Niemand' },
                ]}
                onChange={(v) => cs.patchPrivacy({ bioVisibility: v as Settings['privacy']['bioVisibility'] })}
                isAr={isAr}
              />
              <ToggleRow
                icon={<CheckCircle2 />}
                label={isAr ? 'إيصال القراءة' : 'Lesebestätigungen'}
                description={isAr
                  ? 'عند الإيقاف لن ترى متى يقرأ الآخرون رسائلك ولن يروا متى تقرأ رسائلهم.'
                  : 'Wenn aus, siehst und sendest du keine Lesebestätigungen mehr.'}
                value={cs.settings.privacy.readReceipts}
                onChange={(v) => cs.patchPrivacy({ readReceipts: v })}
              />
              <ToggleRow
                icon={<Send />}
                label={isAr ? 'إظهار "يكتب الآن"' : 'Tippt-Anzeige zeigen'}
                value={cs.settings.privacy.showTyping}
                onChange={(v) => cs.patchPrivacy({ showTyping: v })}
              />
              <ToggleRow
                icon={<ShieldOff />}
                label={isAr ? 'حظر المستخدمين غير المعروفين' : 'Unbekannte automatisch blockieren'}
                description={isAr
                  ? 'لن تتلقى رسائل من أشخاص ليسوا في جهات اتصالك.'
                  : 'Du erhältst nur Nachrichten von Kontakten.'}
                value={cs.settings.privacy.blockUnknownUsers}
                onChange={(v) => cs.patchPrivacy({ blockUnknownUsers: v })}
              />
            </Card>
          </Section>

          {/* Notifications */}
          <Section title={isAr ? 'الإشعارات' : 'Benachrichtigungen'}>
            <Card>
              <ToggleRow
                icon={cs.settings.notifications.enabled ? <Bell /> : <BellOff />}
                label={isAr ? 'تفعيل الإشعارات' : 'Aktiviert'}
                value={cs.settings.notifications.enabled}
                onChange={(v) => cs.patchNotifications({ enabled: v })}
              />
              <ToggleRow
                icon={<Volume2 />}
                label={isAr ? 'الأصوات داخل التطبيق' : 'In-App-Töne'}
                value={cs.settings.notifications.inAppSounds}
                onChange={(v) => cs.patchNotifications({ inAppSounds: v })}
                disabled={!cs.settings.notifications.enabled}
              />
              <ToggleRow
                icon={<VibrateIcon />}
                label={isAr ? 'الاهتزاز' : 'Vibrieren'}
                value={cs.settings.notifications.vibrate}
                onChange={(v) => cs.patchNotifications({ vibrate: v })}
                disabled={!cs.settings.notifications.enabled}
              />
              <ToggleRow
                icon={<Smartphone />}
                label={isAr ? 'إشعارات سطح المكتب' : 'Desktop-Benachrichtigungen'}
                value={cs.settings.notifications.desktop}
                onChange={(v) => cs.patchNotifications({ desktop: v })}
                disabled={!cs.settings.notifications.enabled}
              />
              <ToggleRow
                icon={<EyeOff />}
                label={isAr ? 'إخفاء محتوى الرسالة' : 'Inhalt ausblenden'}
                description={isAr
                  ? 'يُظهر اسم المرسل فقط في الإشعار.'
                  : 'Zeigt nur den Absender in der Notification.'}
                value={cs.settings.notifications.hidePreview}
                onChange={(v) => cs.patchNotifications({ hidePreview: v })}
                disabled={!cs.settings.notifications.enabled}
              />
              <QuietHoursRow
                isAr={isAr}
                start={cs.settings.notifications.quietHoursStart}
                end={cs.settings.notifications.quietHoursEnd}
                onChange={(start, end) =>
                  cs.patchNotifications({ quietHoursStart: start, quietHoursEnd: end })}
                disabled={!cs.settings.notifications.enabled}
              />
            </Card>
          </Section>

          {/* Appearance */}
          <Section title={isAr ? 'المظهر' : 'Darstellung'}>
            <Card>
              <SelectRow
                icon={<Type />}
                label={isAr ? 'حجم الخط' : 'Schriftgröße'}
                value={cs.settings.appearance.fontScale}
                options={[
                  { value: 'small',   labelAr: 'صغير',  labelDe: 'Klein' },
                  { value: 'normal',  labelAr: 'عادي',  labelDe: 'Normal' },
                  { value: 'large',   labelAr: 'كبير',  labelDe: 'Groß' },
                  { value: 'xlarge',  labelAr: 'أكبر',  labelDe: 'Sehr groß' },
                ]}
                onChange={(v) => cs.patchAppearance({ fontScale: v as Settings['appearance']['fontScale'] })}
                isAr={isAr}
              />
              <SelectRow
                icon={<Palette />}
                label={isAr ? 'الكثافة' : 'Dichte'}
                value={cs.settings.appearance.density}
                options={[
                  { value: 'compact',     labelAr: 'مدمج',     labelDe: 'Kompakt' },
                  { value: 'comfortable', labelAr: 'مريح',     labelDe: 'Angenehm' },
                  { value: 'cozy',        labelAr: 'فسيح',     labelDe: 'Geräumig' },
                ]}
                onChange={(v) => cs.patchAppearance({ density: v as Settings['appearance']['density'] })}
                isAr={isAr}
              />
              <ToggleRow
                icon={<ImageIcon />}
                label={isAr ? 'إظهار الصور الشخصية في المجموعات' : 'Avatare in Gruppen'}
                value={cs.settings.appearance.showAvatars}
                onChange={(v) => cs.patchAppearance({ showAvatars: v })}
              />
              <ToggleRow
                icon={<FileText />}
                label={isAr ? 'تجميع الفقاعات المتتالية' : 'Aufeinanderfolgende Bubbles gruppieren'}
                value={cs.settings.appearance.groupBubbles}
                onChange={(v) => cs.patchAppearance({ groupBubbles: v })}
              />
              <ToggleRow
                icon={<Type />}
                label={isAr ? 'إظهار الوقت دائماً' : 'Uhrzeit immer anzeigen'}
                value={cs.settings.appearance.alwaysShowTime}
                onChange={(v) => cs.patchAppearance({ alwaysShowTime: v })}
              />
            </Card>
          </Section>

          {/* Behavior */}
          <Section title={isAr ? 'سلوك المحادثة' : 'Verhalten'}>
            <Card>
              <ToggleRow
                icon={<Send />}
                label={isAr ? 'إرسال بضغطة Enter' : 'Mit Enter senden'}
                description={isAr
                  ? 'استخدم Shift+Enter لسطر جديد.'
                  : 'Mit Shift+Enter neue Zeile.'}
                value={cs.settings.behavior.enterToSend}
                onChange={(v) => cs.patchBehavior({ enterToSend: v })}
              />
              <ToggleRow
                icon={<Globe />}
                label={isAr ? 'إكمال الرموز التعبيرية' : 'Emoji-Vervollständigung'}
                value={cs.settings.behavior.emojiAutoComplete}
                onChange={(v) => cs.patchBehavior({ emojiAutoComplete: v })}
              />
              <ToggleRow
                icon={<ImageIcon />}
                label={isAr ? 'تحميل الصور تلقائياً' : 'Bilder automatisch laden'}
                value={cs.settings.behavior.autoDownloadImages}
                onChange={(v) => cs.patchBehavior({ autoDownloadImages: v })}
              />
              <ToggleRow
                icon={<Mic />}
                label={isAr ? 'تحميل التسجيلات الصوتية تلقائياً' : 'Sprachnachrichten automatisch laden'}
                value={cs.settings.behavior.autoDownloadVoice}
                onChange={(v) => cs.patchBehavior({ autoDownloadVoice: v })}
              />
              <ToggleRow
                icon={<FileText />}
                label={isAr ? 'تحميل الملفات تلقائياً' : 'Dateien automatisch laden'}
                value={cs.settings.behavior.autoDownloadFiles}
                onChange={(v) => cs.patchBehavior({ autoDownloadFiles: v })}
              />
              <SelectRow
                icon={<Globe />}
                label={isAr ? 'تنسيق الوقت' : 'Zeitformat'}
                value={cs.settings.behavior.use24h === null ? 'locale' : cs.settings.behavior.use24h ? '24h' : '12h'}
                options={[
                  { value: 'locale', labelAr: 'حسب اللغة', labelDe: 'Standard' },
                  { value: '24h',    labelAr: '24 ساعة',  labelDe: '24-Stunden' },
                  { value: '12h',    labelAr: '12 ساعة',  labelDe: '12-Stunden' },
                ]}
                onChange={(v) =>
                  cs.patchBehavior({
                    use24h: v === 'locale' ? null : v === '24h',
                  })}
                isAr={isAr}
              />
            </Card>
          </Section>

          {/* Storage */}
          <Section title={isAr ? 'التخزين والبيانات' : 'Speicher & Daten'}>
            <Card>
              {storageReport && (
                <div className="px-4 py-3.5 border-b border-border/15">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-[12.5px] font-medium text-foreground">
                      {isAr ? 'الاستخدام الحالي' : 'Aktuelle Nutzung'}
                    </span>
                    <span className="text-[12px] text-muted-foreground tabular-nums">
                      {storageReport.usageMb.toFixed(1)} {isAr ? 'م.ب' : 'MB'}
                      {storageReport.quotaMb > 0 && (
                        <> / {storageReport.quotaMb.toFixed(0)} {isAr ? 'م.ب' : 'MB'}</>
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
                label={isAr ? 'سعة ذاكرة التخزين (م.ب)' : 'Speichergrenze (MB)'}
                value={cs.settings.storage.cacheCapMb}
                min={0}
                max={2000}
                step={50}
                onChange={(v) => cs.patchStorage({ cacheCapMb: v })}
                helperAr="0 = بلا حد"
                helperDe="0 = unbegrenzt"
              />
              <NumberRow
                icon={<RotateCcw />}
                label={isAr ? 'الاحتفاظ بالرسائل (يوم)' : 'Aufbewahrung (Tage)'}
                value={cs.settings.storage.cacheRetentionDays}
                min={0}
                max={365}
                step={5}
                onChange={(v) => cs.patchStorage({ cacheRetentionDays: v })}
                helperAr="0 = للأبد"
                helperDe="0 = nie löschen"
              />
              <NumberRow
                icon={<ImageIcon />}
                label={isAr ? 'حد الضغط للصور (م.ب)' : 'Kompressionsgrenze Bilder (MB)'}
                value={cs.settings.storage.compressThresholdMb}
                min={0}
                max={20}
                step={0.5}
                onChange={(v) => cs.patchStorage({ compressThresholdMb: v })}
                helperAr="0 = إيقاف الضغط"
                helperDe="0 = nicht komprimieren"
              />
              <SelectRow
                icon={<ImageIcon />}
                label={isAr ? 'جودة الضغط' : 'Komprimierungsqualität'}
                value={String(cs.settings.storage.compressionQuality)}
                options={[
                  { value: '0.6',  labelAr: 'منخفضة (60%)',  labelDe: 'Niedrig (60%)' },
                  { value: '0.75', labelAr: 'متوسطة (75%)',  labelDe: 'Mittel (75%)' },
                  { value: '0.82', labelAr: 'عالية (82%)',   labelDe: 'Hoch (82%)' },
                  { value: '0.92', labelAr: 'ممتازة (92%)',  labelDe: 'Sehr hoch (92%)' },
                ]}
                onChange={(v) => cs.patchStorage({ compressionQuality: parseFloat(v) })}
                isAr={isAr}
              />
              <ActionRow
                icon={<Trash2 className="text-destructive" />}
                label={isAr ? 'مسح ذاكرة التخزين المؤقتة' : 'Lokalen Cache leeren'}
                description={isAr
                  ? 'يحذف الرسائل المخزّنة محلياً والصور المؤقتة. لن يحذف رسائلك من السيرفر.'
                  : 'Löscht lokale Nachrichten und Bild-Caches. Keine Server-Daten betroffen.'}
                onClick={handleClearCache}
                disabled={busyClear}
                danger
              />
            </Card>
          </Section>

          {/* Blocked users */}
          <Section title={isAr ? 'المستخدمون المحظورون' : 'Blockierte Nutzer'}>
            <Card>
              {blockedLoading ? (
                <SkeletonRow />
              ) : blocked.length === 0 ? (
                <div className="px-4 py-6 text-center text-[13px] text-muted-foreground">
                  {isAr ? 'لا يوجد مستخدمون محظورون' : 'Keine Nutzer blockiert'}
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
                        {isAr ? 'فك الحظر' : 'Entsperren'}
                      </Button>
                    </div>
                  );
                })
              )}
            </Card>
          </Section>

          {/* Backup */}
          <Section title={isAr ? 'النسخ الاحتياطي' : 'Sicherung'}>
            <Card>
              <ActionRow
                icon={<Download />}
                label={isAr ? 'تصدير المحادثات (JSON)' : 'Chats als JSON exportieren'}
                description={isAr
                  ? 'يصدّر قائمة محادثاتك وإعداداتك لاستيرادها في جهاز آخر.'
                  : 'Exportiert deine Chat-Liste und Einstellungen.'}
                onClick={handleExport}
              />
              <ActionRow
                icon={<Upload />}
                label={isAr ? 'استيراد (قريباً)' : 'Importieren (bald)'}
                description={isAr ? 'سيكون متاحاً في تحديث لاحق.' : 'In einem späteren Update verfügbar.'}
                onClick={() => toast.info(isAr ? 'قريباً' : 'Bald verfügbar')}
                disabled
              />
            </Card>
          </Section>

          {/* Danger zone */}
          <Section title={isAr ? 'إجراءات متقدّمة' : 'Erweitert'}>
            <Card variant="danger">
              <ActionRow
                icon={<RefreshCcw className="text-destructive" />}
                label={isAr ? 'إعادة تعيين كل الإعدادات' : 'Alle Einstellungen zurücksetzen'}
                description={isAr
                  ? 'تُعاد كل خيارات الدردشة إلى الافتراضي. لن تتأثر الرسائل أو المحادثات.'
                  : 'Setzt alle Chat-Optionen zurück. Nachrichten bleiben erhalten.'}
                onClick={() => {
                  cs.resetToDefaults();
                  toast.success(isAr ? 'تمت إعادة التعيين' : 'Zurückgesetzt');
                }}
                danger
              />
            </Card>
          </Section>

          <p className="text-[10.5px] text-muted-foreground/60 text-center pt-2 px-4 leading-relaxed">
            <AlertTriangle className="inline w-3 h-3 me-1 -mt-0.5" />
            {isAr
              ? 'هذه الإعدادات تُحفظ تلقائياً وتُزامَن عبر أجهزتك.'
              : 'Diese Einstellungen werden automatisch synchronisiert.'}
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
      <p className="text-[10.5px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-1">
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
          <p className="text-[11.5px] text-muted-foreground/80 mt-0.5 leading-snug">{description}</p>
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
  options: Array<{ value: string; labelAr: string; labelDe: string }>;
  onChange: (next: string) => void;
  isAr: boolean;
}
function SelectRow({ icon, label, value, options, onChange, isAr }: SelectRowProps) {
  const current = options.find(o => o.value === value) ?? options[0];
  return (
    <div className="relative">
      <div className="w-full flex items-center gap-3 px-4 py-3">
        <span className="shrink-0 text-primary [&>svg]:w-[18px] [&>svg]:h-[18px] [&>svg]:stroke-[1.7]">
          {icon}
        </span>
        <span className="flex-1 text-[14px] font-medium text-foreground">{label}</span>
        <span className="text-[12.5px] text-muted-foreground inline-flex items-center gap-1">
          {isAr ? current.labelAr : current.labelDe}
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
              {isAr ? o.labelAr : o.labelDe}
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
  helperDe?: string;
}
function NumberRow({ icon, label, value, min, max, step, onChange, helperAr, helperDe }: NumberRowProps) {
  const { language } = useApp();
  const isAr = language === 'ar';
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3 mb-2">
        <span className="shrink-0 text-primary [&>svg]:w-[18px] [&>svg]:h-[18px] [&>svg]:stroke-[1.7]">{icon}</span>
        <span className="flex-1 text-[14px] font-medium text-foreground">{label}</span>
        <span className="text-[12.5px] text-muted-foreground tabular-nums min-w-[2ch] text-end">{value}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
      {(helperAr || helperDe) && (
        <p className="text-[10.5px] text-muted-foreground/70 mt-1">
          {isAr ? helperAr : helperDe}
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
          <p className="text-[11.5px] text-muted-foreground/80 mt-0.5 leading-snug">{description}</p>
        )}
      </div>
    </button>
  );
}

interface QuietHoursRowProps {
  isAr: boolean;
  start: number | null;
  end: number | null;
  onChange: (start: number | null, end: number | null) => void;
  disabled?: boolean;
}
function QuietHoursRow({ isAr, start, end, onChange, disabled }: QuietHoursRowProps) {
  const enabled = start !== null && end !== null;
  return (
    <div className={cn('px-4 py-3', disabled && 'opacity-60')}>
      <div className="flex items-center gap-3 mb-2">
        <span className="shrink-0 text-primary"><BellOff className="w-[18px] h-[18px] stroke-[1.7]" /></span>
        <span className="flex-1 text-[14px] font-medium text-foreground">
          {isAr ? 'وضع الهدوء' : 'Ruhezeiten'}
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
          aria-label={isAr ? 'تفعيل وضع الهدوء' : 'Ruhezeiten aktivieren'}
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
            label={isAr ? 'من' : 'Von'}
            value={start ?? 22}
            onChange={(v) => onChange(v, end ?? 7)}
          />
          <HourPicker
            label={isAr ? 'إلى' : 'Bis'}
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
