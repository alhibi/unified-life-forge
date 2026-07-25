/**
 * Portal — the first screen of amv.life, restyled in the MODKEYS design
 * language (quoted from `thebuggeddev/modkeys`, a Vite single-file
 * "MODKEYS — Keyboard Configurator").
 *
 * What was quoted and how it maps onto this launcher:
 *
 *   modkeys                        →  amv.life Portal
 *   ─────────────────────────────────────────────────────────────────
 *   264px near-black rail          →  the seven apps as nav rows, with
 *   (CONFIGURE + nav + summary)       status dots / unread meta, plus a
 *                                     "الآن" summary block and the white
 *                                     54px CTA at the bottom
 *   72px topbar, centred tabs      →  top-level destinations with the
 *   with 2px ink underline            same underline indicator
 *   round 38px icon buttons,       →  theme / chat (badge) / account
 *   badge, ringed avatar, popover      menu
 *   stage with radial glow +       →  the launcher grid, with category
 *   segmented pills (sliding          pills sliding over it and the
 *   indicator) + floating toolbar     view toolbar floating below
 *   FEATURED BUILDS card track     →  "روابط سريعة" deep links
 *   314px right panel (chips,      →  the selected app: sections as
 *   option cards, toggles, hints)     option cards + quick toggles
 *
 * Palette, radii, type ramp and motion curves live in
 * `src/styles/modkeys.css` under `--mk-*` so the app's own theme engine
 * (which rewrites `--background`, `--primary`, …) never disturbs them.
 * `preserve-fx` on the root opts this page out of the global FLATTEN
 * rule, because the modkeys look needs its soft 4/16px shadows.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SEO from '@/components/SEO';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { getAppleEmojiUrl, isEmojiAvatarValue } from '@/utils/emojiAvatar';
import { getDefaultAvatarForUser } from '@/utils/defaultAvatar';
import AppTile, { type AppTileDef } from '@/components/portal/AppTile';
import {
  MkArrow,
  MkBook,
  MkBookmark,
  MkChevronNext,
  MkChevronPrev,
  MkClock,
  MkCloudSun,
  MkCompass,
  MkCrown,
  MkDice,
  MkGear,
  MkGridView,
  MkHouse,
  MkLayers,
  MkListView,
  MkLogo,
  MkMessage,
  MkMic,
  MkMoon,
  MkPencil,
  MkPulse,
  MkSpin,
  MkStar,
  MkSun,
  MkUser,
} from '@/components/portal/MkIcons';
import '@/styles/modkeys.css';

/* ── data ─────────────────────────────────────────────────────────── */

type Cat = 'all' | 'spirit' | 'body' | 'mind' | 'play';

interface MkApp extends AppTileDef {
  labelDe: string;
  descriptionDe: string;
  /** Deep links rendered as option cards in the right panel. */
  links: { path: string; ar: string; de: string; note: string; noteDe: string }[];
}

const APPS: MkApp[] = [
  {
    key: 'now',
    path: '/now',
    icon: MkHouse,
    caption: 'NOW',
    cat: 'spirit',
    label: 'الرئيسي',
    labelDe: 'Jetzt',
    description: 'الصلاة، الطقس، ونبض الأمة',
    descriptionDe: 'Gebet, Wetter, Ummah-Puls',
    links: [
      { path: '/now', ar: 'لوحة الآن', de: 'Jetzt-Board', note: 'الصلاة القادمة وسنة الوقت', noteDe: 'Nächstes Gebet & Sunnah' },
      { path: '/weather', ar: 'الطقس', de: 'Wetter', note: 'الحالة، الأشعة، وجودة الهواء', noteDe: 'Lage, UV, Luftqualität' },
      { path: '/occasions', ar: 'المناسبات', de: 'Anlässe', note: 'التقويم الهجري والمواسم', noteDe: 'Hijri-Kalender' },
    ],
  },
  {
    key: 'mihrab',
    path: '/mihrab',
    icon: MkBook,
    caption: 'MIHRAB',
    cat: 'spirit',
    label: 'محراب',
    labelDe: 'Mihrab',
    description: 'القرآن، الأذكار، والسنن',
    descriptionDe: 'Quran, Adhkar, Sunan',
    links: [
      { path: '/mihrab', ar: 'المحراب', de: 'Mihrab', note: 'القرآن والتلاوة', noteDe: 'Quran & Rezitation' },
      { path: '/duas', ar: 'الأدعية', de: 'Duas', note: 'أذكار الصباح والمساء', noteDe: 'Morgen- & Abendadhkar' },
      { path: '/tafsir', ar: 'التفسير', de: 'Tafsir', note: 'شرح الآيات', noteDe: 'Verserklärung' },
      { path: '/mihrab/prayer-guide', ar: 'دليل الصلاة', de: 'Gebetsleitfaden', note: 'خطوة بخطوة', noteDe: 'Schritt für Schritt' },
    ],
  },
  {
    key: 'wellness',
    path: '/wellness',
    icon: MkPulse,
    caption: 'WELLNESS',
    cat: 'body',
    label: 'العافية',
    labelDe: 'Wellness',
    description: 'تدريب، تغذية، وموسوعة',
    descriptionDe: 'Training, Ernährung',
    links: [
      { path: '/wellness', ar: 'مركز العافية', de: 'Wellness-Hub', note: 'التمارين والخطط', noteDe: 'Übungen & Pläne' },
      { path: '/journal', ar: 'اليومية', de: 'Journal', note: 'تدوين الحال والعادات', noteDe: 'Stimmung & Gewohnheiten' },
    ],
  },
  {
    key: 'chat',
    path: '/chat',
    icon: MkMessage,
    caption: 'CHAT',
    cat: 'mind',
    label: 'الدردشة',
    labelDe: 'Chat',
    description: 'محادثات خاصة ومجموعات',
    descriptionDe: 'Private Chats & Gruppen',
    links: [
      { path: '/chat', ar: 'المحادثات', de: 'Chats', note: 'كل الرسائل', noteDe: 'Alle Nachrichten' },
      { path: '/chat/groups', ar: 'المجموعات', de: 'Gruppen', note: 'الغرف المشتركة', noteDe: 'Gemeinsame Räume' },
      { path: '/chat/settings', ar: 'إعدادات الدردشة', de: 'Chat-Einstellungen', note: 'الخصوصية والتنبيهات', noteDe: 'Privatsphäre & Alarme' },
    ],
  },
  {
    key: 'browse',
    path: '/browse',
    icon: MkCompass,
    caption: 'BROWSE',
    cat: 'mind',
    label: 'اطلاع',
    labelDe: 'Entdecken',
    description: 'مقالات، بودكاست، ومتابعات',
    descriptionDe: 'Artikel, Podcasts, Feeds',
    links: [
      { path: '/browse', ar: 'الاستكشاف', de: 'Entdecken', note: 'المتابعات اليومية', noteDe: 'Tägliche Feeds' },
      { path: '/podcasts', ar: 'البودكاست', de: 'Podcasts', note: 'المكتبة والسجل', noteDe: 'Bibliothek & Verlauf' },
      { path: '/reading', ar: 'القراءة', de: 'Lesen', note: 'قائمة القراءة', noteDe: 'Leseliste' },
    ],
  },
  {
    key: 'knowledge',
    path: '/knowledge',
    icon: MkCrown,
    caption: 'KNOWLEDGE',
    cat: 'mind',
    label: 'المعرفة',
    labelDe: 'Wissen',
    description: 'موسوعة ومونوغرافات مفهرسة',
    descriptionDe: 'Enzyklopädie & Monographien',
    links: [
      { path: '/knowledge', ar: 'الموسوعة', de: 'Enzyklopädie', note: 'المدخل الرئيسي', noteDe: 'Haupteingang' },
      { path: '/diwan/library', ar: 'مكتبة الديوان', de: 'Diwan-Bibliothek', note: 'الشعراء والقصائد', noteDe: 'Dichter & Gedichte' },
      { path: '/archive', ar: 'الأرشيف', de: 'Archiv', note: 'المحفوظات والقراءة', noteDe: 'Gespeichertes' },
      { path: '/pkm', ar: 'الذاكرة', de: 'PKM', note: 'الملاحظات والخرائط', noteDe: 'Notizen & Karten' },
    ],
  },
  {
    key: 'games',
    path: '/games',
    icon: MkDice,
    caption: 'GAMES',
    cat: 'play',
    label: 'الألعاب',
    labelDe: 'Spiele',
    description: 'شطرنج، سودوكو، وتركيز',
    descriptionDe: 'Schach, Sudoku, Fokus',
    links: [
      { path: '/games', ar: 'صالة الألعاب', de: 'Spielhalle', note: 'كل الألعاب', noteDe: 'Alle Spiele' },
      { path: '/games/chess', ar: 'الشطرنج', de: 'Schach', note: 'مباريات وألغاز', noteDe: 'Partien & Puzzles' },
      { path: '/games/sudoku', ar: 'سودوكو', de: 'Sudoku', note: 'أربع درجات', noteDe: 'Vier Stufen' },
      { path: '/games/focus', ar: 'التركيز', de: 'Fokus', note: 'تدريب الانتباه', noteDe: 'Aufmerksamkeit' },
    ],
  },
];

const CATS: { key: Cat; ar: string; de: string }[] = [
  { key: 'all', ar: 'الكل', de: 'Alle' },
  { key: 'spirit', ar: 'الروح', de: 'Geist' },
  { key: 'body', ar: 'الجسد', de: 'Körper' },
  { key: 'mind', ar: 'العقل', de: 'Denken' },
  { key: 'play', ar: 'اللعب', de: 'Spiel' },
];

/* ── page ─────────────────────────────────────────────────────────── */

export default function Portal() {
  const navigate = useNavigate();
  const { language, theme, setTheme, dir } = useApp();
  const { user, username, profile } = useAuth();
  const { unreadCount } = useUnreadMessages();
  const isAr = language === 'ar';
  const rtl = dir === 'rtl';

  const [cat, setCat] = useState<Cat>('all');
  const [selected, setSelected] = useState<string>('now');
  const [list, setList] = useState(false);
  const [acctOpen, setAcctOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [clock, setClock] = useState(() => new Date());

  const isDark = theme === 'dark';

  /* ── the ink clock in the summary block ── */
  useEffect(() => {
    const id = window.setInterval(() => setClock(new Date()), 20_000);
    return () => window.clearInterval(id);
  }, []);

  /* ── toast auto-dismiss ── */
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  /* ── close the account popover on outside click / Escape ── */
  const acctRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!acctOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!acctRef.current?.contains(e.target as Node)) setAcctOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setAcctOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [acctOpen]);

  const visible = useMemo(
    () => (cat === 'all' ? APPS : APPS.filter(a => a.cat === cat)),
    [cat],
  );

  /* Keep the right panel pointed at something inside the active filter. */
  useEffect(() => {
    if (!visible.some(a => a.key === selected)) setSelected(visible[0]?.key ?? 'now');
  }, [visible, selected]);

  const current = APPS.find(a => a.key === selected) ?? APPS[0];

  /* ── sliding pill indicator (modkeys #pillInd) ── */
  const pillsRef = useRef<HTMLDivElement | null>(null);
  const [ind, setInd] = useState<{ x: number; w: number }>({ x: 0, w: 0 });

  const measurePill = useCallback(() => {
    const box = pillsRef.current;
    if (!box) return;
    const btn = box.querySelector<HTMLButtonElement>('button[data-on="true"]');
    if (!btn) return;
    setInd({ x: btn.offsetLeft - box.clientLeft, w: btn.offsetWidth });
  }, []);

  useLayoutEffect(() => {
    measurePill();
  }, [cat, isAr, measurePill]);

  useEffect(() => {
    const onResize = () => measurePill();
    window.addEventListener('resize', onResize);
    // Fonts land after first paint — remeasure once they do.
    const id = window.setTimeout(onResize, 400);
    return () => {
      window.removeEventListener('resize', onResize);
      window.clearTimeout(id);
    };
  }, [measurePill]);

  /* ── featured track arrows ── */
  const trackRef = useRef<HTMLDivElement | null>(null);
  const scrollTrack = (forward: boolean) => {
    const amount = 182;
    trackRef.current?.scrollBy({
      left: (forward ? 1 : -1) * (rtl ? -amount : amount),
      behavior: 'smooth',
    });
  };

  /* ── toolbar actions (modkeys pan / spin / zoom trio) ── */
  const suggest = () => {
    const pick = visible[Math.floor(Math.random() * visible.length)] ?? APPS[0];
    setSelected(pick.key);
    setToast(
      isAr ? `مقترح: ${pick.label}` : `Vorschlag: ${pick.labelDe}`,
    );
  };

  const tiles: AppTileDef[] = visible.map(a => ({
    key: a.key,
    path: a.path,
    icon: a.icon,
    caption: a.caption,
    cat: a.cat,
    label: isAr ? a.label : a.labelDe,
    description: isAr ? a.description : a.descriptionDe,
  }));

  const hh = String(clock.getHours()).padStart(2, '0');
  const mm = String(clock.getMinutes()).padStart(2, '0');
  const dateLine = clock.toLocaleDateString(isAr ? 'ar' : 'de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const Chevron = rtl ? MkChevronPrev : MkChevronNext;
  const ChevronBack = rtl ? MkChevronNext : MkChevronPrev;

  /* ── shared fragments ── */

  const summaryBlock = (
    <>
      <div className="mk-sum">{isAr ? 'الوقت الآن' : 'Jetzt'}</div>
      <div className="mk-price">
        <span className="int">{hh}</span>
        <span className="cur">:</span>
        <span className="int">{mm}</span>
      </div>
      <div className="mk-bar" aria-hidden>
        <i />
      </div>
      <div className="mk-sum" style={{ margin: '12px 4px 14px' }}>
        {dateLine}
      </div>
      <button className="mk-cta" onClick={() => navigate('/now')}>
        <span>{isAr ? 'افتح الرئيسي' : 'Jetzt öffnen'}</span>
        <MkArrow size={18} />
      </button>
      <button className="mk-save-row" onClick={() => navigate('/settings')}>
        <MkBookmark size={18} />
        {isAr ? 'الإعدادات والتفضيلات' : 'Einstellungen'}
      </button>
    </>
  );

  return (
    <div className="mk preserve-fx">
      <SEO
        title="amv.life — بوابتك الشخصية"
        description="بوابة amv.life الشخصية: الرئيسي، المحراب، العافية، الدردشة، اطلاع، المعرفة، والألعاب — تطبيقات متكاملة في مكان واحد."
        path="/"
      />

      <div className="mk-app">
        <h1 className="sr-only">
          {isAr ? 'amv.life — بوابتك الشخصية' : 'amv.life — Deine persönliche Startseite'}
        </h1>

        <div className="mk-frame">
          {/* ============ RAIL (desktop) ============ */}
          <aside className="mk-rail">
            <div className="mk-logo">
              <MkLogo size={24} />
              <b>AMV.LIFE</b>
            </div>

            <div className="mk-side-label">{isAr ? 'التطبيقات' : 'APPS'}</div>
            <nav className="mk-snav">
              {APPS.map(a => (
                <button
                  key={a.key}
                  className={selected === a.key ? 'on' : undefined}
                  onClick={() => setSelected(a.key)}
                  onDoubleClick={() => navigate(a.path)}
                >
                  <a.icon className="mk-ic" size={20} />
                  {isAr ? a.label : a.labelDe}
                  {a.key === 'chat' && unreadCount > 0 ? (
                    <span className="mk-meta">{unreadCount}</span>
                  ) : (
                    <span
                      className="mk-dot"
                      style={{
                        background:
                          selected === a.key ? '#fff' : 'rgba(255,255,255,.22)',
                      }}
                    />
                  )}
                </button>
              ))}
            </nav>

            <div className="mk-rail-bottom">{summaryBlock}</div>
          </aside>

          {/* ============ MAIN ============ */}
          <div className="mk-main">
            <header className="mk-topbar">
              <div className="mk-brand">
                <MkLogo size={21} />
                <b>AMV.LIFE</b>
              </div>

              <div className="mk-top-icons" ref={acctRef}>
                <button
                  className="mk-icon-btn"
                  onClick={() => setTheme(isDark ? 'light' : 'dark')}
                  aria-label={isAr ? 'تبديل السمة' : 'Theme wechseln'}
                >
                  {isDark ? <MkMoon size={18} /> : <MkSun size={19} />}
                </button>

                {user && (
                  <button
                    className="mk-icon-btn"
                    onClick={() => navigate('/chat')}
                    aria-label={isAr ? 'المحادثات' : 'Chat'}
                  >
                    <MkMessage size={20} />
                    {unreadCount > 0 && <span className="mk-badge">{unreadCount}</span>}
                  </button>
                )}

                <button
                  className="mk-avatar"
                  onClick={() => setAcctOpen(v => !v)}
                  aria-label={isAr ? 'الحساب' : 'Konto'}
                  aria-expanded={acctOpen}
                >
                  {user ? (
                    profile?.avatar_url && profile.avatar_url.startsWith('http') ? (
                      <img src={profile.avatar_url} alt="" />
                    ) : profile?.avatar_url && isEmojiAvatarValue(profile.avatar_url) ? (
                      <img
                        src={getAppleEmojiUrl(profile.avatar_url) || ''}
                        alt=""
                        style={{ width: 20, height: 20, objectFit: 'contain' }}
                      />
                    ) : (
                      <img src={getDefaultAvatarForUser(username || 'U')} alt="" />
                    )
                  ) : (
                    <MkUser size={19} />
                  )}
                </button>

                {acctOpen && (
                  <div className="mk-acct">
                    <div className="who">
                      {user ? (isAr ? 'مسجّل الدخول باسم' : 'Angemeldet als') : isAr ? 'زائر' : 'Gast'}
                      <b>{user ? username || user.email : isAr ? 'بدون حساب' : 'Kein Konto'}</b>
                    </div>
                    {user ? (
                      <>
                        <button onClick={() => navigate('/profile')}>
                          {isAr ? 'الملف الشخصي' : 'Profil'}
                        </button>
                        <button onClick={() => navigate('/settings')}>
                          {isAr ? 'الإعدادات' : 'Einstellungen'}
                        </button>
                        <button onClick={() => navigate('/settings/theme')}>
                          {isAr ? 'السمة والألوان' : 'Theme & Farben'}
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => navigate('/auth')}>
                          {isAr ? 'تسجيل الدخول' : 'Anmelden'}
                        </button>
                        <button onClick={() => navigate('/settings')}>
                          {isAr ? 'الإعدادات' : 'Einstellungen'}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </header>

            <div className="mk-content">
              {/* ---- stage: pills + launcher grid + toolbar ---- */}
              <div className="mk-stage-col">
                <div className="mk-stage">
                  <div className="mk-pills" ref={pillsRef}>
                    <div
                      className="mk-pill-ind"
                      style={{ transform: `translateX(${ind.x}px)`, width: ind.w }}
                      aria-hidden
                    />
                    {CATS.map(c => (
                      <button
                        key={c.key}
                        data-on={c.key === cat}
                        className={c.key === cat ? 'on' : undefined}
                        onClick={() => setCat(c.key)}
                      >
                        {isAr ? c.ar : c.de}
                      </button>
                    ))}
                  </div>

                  <div className="mk-stage-scroll">
                  <div className="mk-hero">
                    <button
                      className="mk-medallion"
                      onClick={() => navigate('/now')}
                      aria-label={isAr ? 'افتح الرئيسي' : 'Jetzt öffnen'}
                    >
                      <MkLogo size={26} />
                    </button>
                    <div className="kicker">
                      {isAr ? 'بوابة شخصية' : 'PERSÖNLICHES PORTAL'}
                    </div>
                    <h2>
                      {username
                        ? isAr
                          ? `أهلاً ${username}`
                          : `Willkommen, ${username}`
                        : isAr
                          ? 'أهلاً بك'
                          : 'Willkommen'}
                    </h2>
                    <p>
                      {isAr
                        ? 'سبعة تطبيقات، لوحة واحدة. اختر قسماً من الشرائح، ثم اضغط على أي بطاقة لفتحها.'
                        : 'Sieben Apps, eine Oberfläche. Filtere oben, tippe auf eine Karte zum Öffnen.'}
                    </p>
                  </div>

                  <div className={`mk-grid${list ? ' list' : ''}`}>
                    {tiles.map((tile, i) => (
                      <AppTile
                        key={tile.key}
                        tile={tile}
                        index={i}
                        list={list}
                        selected={selected === tile.key}
                        onSelect={() => setSelected(tile.key)}
                        onOpen={() => navigate(tile.path)}
                      />
                    ))}
                  </div>
                  </div>

                  {/* floating view toolbar — modkeys' pan / spin / zoom trio */}
                  <div className="mk-toolbar">
                    <button
                      onClick={() => setList(v => !v)}
                      className={list ? 'on' : undefined}
                      title={isAr ? 'طريقة العرض' : 'Ansicht'}
                      aria-label={isAr ? 'طريقة العرض' : 'Ansicht'}
                    >
                      {list ? <MkListView size={19} /> : <MkGridView size={19} />}
                    </button>
                    <button
                      onClick={() => navigate(current.path)}
                      title={isAr ? 'افتح المحدد' : 'Auswahl öffnen'}
                      aria-label={isAr ? 'افتح التطبيق المحدد' : 'Ausgewählte App öffnen'}
                    >
                      <MkArrow size={19} />
                    </button>
                  </div>
                </div>
              </div>

            </div>

            <div className="mk-foot">
              <div className="rule" />
              <span>
                {isAr ? 'صنع بحب — عامر و امولة' : 'MADE BY AMER & AMOULA'}
              </span>
              <div className="rule" />
            </div>
          </div>
        </div>

        {toast && (
          <div className="mk-toast" role="status">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
