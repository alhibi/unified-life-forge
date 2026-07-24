import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import SEO from '@/components/SEO';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import SmartGreeting from '@/components/SmartGreeting';
import {
  BookOpen,
  Compass,
  Crown,
  Dices,
  HeartPulse,
  House,
  MessageCircle,
  Settings,
  Sparkles,
  UserCircle,
} from '@/lib/icons';
import { getAppleEmojiUrl, isEmojiAvatarValue } from '@/utils/emojiAvatar';
import { getDefaultAvatarForUser } from '@/utils/defaultAvatar';
import { PageShell, IconButton } from '@/components/ui/app-shell';
import AppTile, { type AppTileDef } from '@/components/portal/AppTile';

/**
 * Portal — the new home screen of SmartHub.
 *
 * A personal launcher: seven "apps" laid out as a grid, with a
 * central identity icon at the top, and profile/settings shortcuts
 * in the corner. Replaces the previous cluttered home page — the old
 * home content now lives under `/now` as its own dedicated app.
 */
export default function Portal() {
  const navigate = useNavigate();
  const { language, t } = useApp();
  const { user, username, profile } = useAuth();
  const { unreadCount } = useUnreadMessages();
  const isAr = language === 'ar';

  const tiles: AppTileDef[] = [
    {
      key: 'now',
      path: '/now',
      icon: House,
      label: isAr ? 'الرئيسي' : 'Jetzt',
      description: isAr
        ? 'أوقات الصلاة، الطقس، سنة الوقت، ونبض الأمة.'
        : 'Gebetszeiten, Wetter, Sunnah der Stunde, Ummah-Puls.',
      accent: '#c4b5fd',
    },
    {
      key: 'mihrab',
      path: '/mihrab',
      icon: BookOpen,
      label: isAr ? 'محراب' : 'Mihrab',
      description: isAr
        ? 'القرآن، الأذكار، السنن، والأدب.'
        : 'Quran, Adhkar, Sunan und Literatur.',
      accent: '#fcd34d',
    },
    {
      key: 'wellness',
      path: '/wellness',
      icon: HeartPulse,
      label: isAr ? 'العافية' : 'Wellness',
      description: isAr
        ? 'تدريب، تغذية، وموسوعة صحية.'
        : 'Training, Ernährung und Enzyklopädie.',
      accent: '#34d399',
    },
    {
      key: 'chat',
      path: '/chat',
      icon: MessageCircle,
      label: isAr ? 'الدردشة' : 'Chat',
      description: isAr
        ? 'محادثات خاصة ومجموعات آمنة.'
        : 'Private Chats und sichere Gruppen.',
      accent: '#7dd3fc',
    },
    {
      key: 'browse',
      path: '/browse',
      icon: Compass,
      label: isAr ? 'اطلاع' : 'Entdecken',
      description: isAr
        ? 'مقالات، بودكاست، ومتابعات يومية.'
        : 'Artikel, Podcasts und tägliche Feeds.',
      accent: '#a78bfa',
    },
    {
      key: 'knowledge',
      path: '/knowledge',
      icon: Crown,
      label: isAr ? 'المعرفة' : 'Wissen',
      description: isAr
        ? 'موسوعة فاخرة ومونوغرافات مفهرسة.'
        : 'Luxus-Enzyklopädie und Monographien.',
      accent: '#e8a87c',
    },
    {
      key: 'games',
      path: '/games',
      icon: Dices,
      label: isAr ? 'الألعاب' : 'Spiele',
      description: isAr
        ? 'شطرنج، سودوكو، ذاكرة، وتركيز.'
        : 'Schach, Sudoku, Memory und Fokus.',
      accent: '#fb923c',
    },
  ];

  return (
    <PageShell>
      <SEO
        title="SmartHub — بوابتك الشخصية"
        description="بوابة SmartHub الشخصية: الرئيسي، المحراب، العافية، الدردشة، اطلاع، المعرفة، والألعاب — تطبيقات متكاملة في مكان واحد."
        path="/"
      />
      <h1 className="sr-only">
        {isAr ? 'SmartHub — بوابتك الشخصية' : 'SmartHub — Deine persönliche Startseite'}
      </h1>

      {/* Header: avatar + settings in the corner */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => navigate(user ? '/profile' : '/settings')}
          className="relative w-11 h-11 rounded-full ring-2 ring-primary/20 overflow-hidden active:scale-95 transition-transform"
          aria-label={
            user
              ? isAr ? 'الملف الشخصي' : 'Profil'
              : isAr ? 'الإعدادات' : 'Einstellungen'
          }
        >
          {user ? (
            profile?.avatar_url && profile.avatar_url.startsWith('http') ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover object-top" />
            ) : profile?.avatar_url && isEmojiAvatarValue(profile.avatar_url) ? (
              <span className="w-full h-full flex items-center justify-center bg-accent/40">
                <img src={getAppleEmojiUrl(profile.avatar_url) || ''} alt="" className="w-6 h-6" />
              </span>
            ) : (
              <img src={getDefaultAvatarForUser(username || 'U')} alt="" className="w-full h-full object-cover" />
            )
          ) : (
            <span className="w-full h-full flex items-center justify-center bg-accent/40">
              <UserCircle className="h-5 w-5 text-foreground" />
            </span>
          )}
        </button>

        <div className="flex items-center gap-2 shrink-0">
          {user && (
            <IconButton onClick={() => navigate('/chat')} aria-label={isAr ? 'المحادثات' : 'Chat'}>
              <MessageCircle className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -end-1 bg-destructive text-destructive-foreground text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-bold animate-pulse">
                  {unreadCount}
                </span>
              )}
            </IconButton>
          )}
          <IconButton
            onClick={() => navigate('/settings')}
            aria-label={isAr ? 'الإعدادات' : 'Einstellungen'}
          >
            <Settings className="h-5 w-5" />
          </IconButton>
        </div>
      </div>

      {/* Central identity: greeting + medallion */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center text-center pt-6 pb-8 gap-4"
      >
        <SmartGreeting />
        <button
          onClick={() => navigate('/now')}
          aria-label={isAr ? 'افتح الرئيسي' : 'Jetzt öffnen'}
          className="relative w-[76px] h-[76px] rounded-full flex items-center justify-center active:scale-95 transition-transform"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, hsl(var(--live)/0.35), hsl(var(--live)/0.08) 55%, transparent 75%)',
            boxShadow:
              '0 0 0 1px hsl(var(--live)/0.28) inset, 0 12px 40px -12px hsl(var(--live)/0.55)',
          }}
        >
          <span
            className="absolute inset-0 rounded-full animate-pulse"
            style={{
              background: 'radial-gradient(circle, hsl(var(--live)/0.15) 0%, transparent 65%)',
            }}
            aria-hidden
          />
          <Sparkles className="w-7 h-7 text-[hsl(var(--live))] drop-shadow" />
        </button>
      </motion.div>

      {/* App grid */}
      <section aria-label={isAr ? 'التطبيقات' : 'Apps'}>
        <div className="grid grid-cols-2 gap-3">
          {tiles.map((tile, i) => (
            <AppTile key={tile.key} tile={tile} index={i} />
          ))}
        </div>
      </section>

      {/* Footer attribution */}
      <div className="flex items-center justify-center gap-2 py-8 mt-2">
        <div className="h-px flex-1 bg-border/40" />
        <span className="text-[11px] text-muted-foreground font-medium tracking-wide">
          {t('footer.madeBy')} <span className="text-primary font-semibold">عامر</span> {t('footer.and')} <span className="text-primary font-semibold">امولة</span> ✦
        </span>
        <div className="h-px flex-1 bg-border/40" />
      </div>
    </PageShell>
  );
}