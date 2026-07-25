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
  MkCompass,
  MkCrown,
  MkDice,
  MkGridView,
  MkHouse,
  MkListView,
  MkLogo,
  MkMessage,
  MkMoon,
  MkPulse,
  MkSun,
  MkUser,
} from '@/components/portal/MkIcons';
import '@/styles/modkeys.css';

/* ── data ─────────────────────────────────────────────────────────── */

type Cat = 'all' | 'spirit' | 'body' | 'mind' | 'play';

interface MkApp extends AppTileDef {
  /** Deep links rendered as option cards in the right panel. */
  links: { path: string; ar: string; note: string; }[];
}

const APPS: MkApp[] = [
  {
    key: 'now',
    path: '/now',
    icon: MkHouse,
    caption: 'NOW',
    cat: 'spirit',
    label: 'الرئيسي',
    description: 'الصلاة، الطقس، ونبض الأمة',
    links: [
      { path: '/now', ar: 'لوحة الآن', note: 'الصلاة القادمة وسنة الوقت', },
      { path: '/weather', ar: 'الطقس', note: 'الحالة، الأشعة، وجودة الهواء', },
      { path: '/occasions', ar: 'المناسبات', note: 'التقويم الهجري والمواسم', },
    ],
  },
  {
    key: 'mihrab',
    path: '/mihrab',
    icon: MkBook,
    caption: 'MIHRAB',
    cat: 'spirit',
    label: 'محراب',
    description: 'القرآن، الأذكار، والسنن',
    links: [
      { path: '/mihrab', ar: 'المحراب', note: 'القرآن والتلاوة', },
      { path: '/duas', ar: 'الأدعية', note: 'أذكار الصباح والمساء', },
      { path: '/tafsir', ar: 'التفسير', note: 'شرح الآيات', },
      { path: '/mihrab/prayer-guide', ar: 'دليل الصلاة', note: 'خطوة بخطوة', },
    ],
  },
  {
    key: 'wellness',
    path: '/wellness',
    icon: MkPulse,
    caption: 'WELLNESS',
    cat: 'body',
    label: 'العافية',
    description: 'تدريب، تغذية، وموسوعة',
    links: [
      { path: '/wellness', ar: 'مركز العافية', note: 'التمارين والخطط', },
      { path: '/journal', ar: 'اليومية', note: 'تدوين الحال والعادات', },
    ],
  },
  {
    key: 'chat',
    path: '/chat',
    icon: MkMessage,
    caption: 'CHAT',
    cat: 'mind',
    label: 'الدردشة',
    description: 'محادثات خاصة ومجموعات',
    links: [
      { path: '/chat', ar: 'المحادثات', note: 'كل الرسائل', },
      { path: '/chat/groups', ar: 'المجموعات', note: 'الغرف المشتركة', },
      { path: '/chat/settings', ar: 'إعدادات الدردشة', note: 'الخصوصية والتنبيهات', },
    ],
  },
  {
    key: 'browse',
    path: '/browse',
    icon: MkCompass,
    caption: 'BROWSE',
    cat: 'mind',
    label: 'اطلاع',
    description: 'مقالات، بودكاست، ومتابعات',
    links: [
      { path: '/browse', ar: 'الاستكشاف', note: 'المتابعات اليومية', },
      { path: '/podcasts', ar: 'البودكاست', note: 'المكتبة والسجل', },
      { path: '/reading', ar: 'القراءة', note: 'قائمة القراءة', },
    ],
  },
  {
    key: 'knowledge',
    path: '/knowledge',
    icon: MkCrown,
    caption: 'KNOWLEDGE',
    cat: 'mind',
    label: 'المعرفة',
    description: 'موسوعة ومونوغرافات مفهرسة',
    links: [
      { path: '/knowledge', ar: 'الموسوعة', note: 'المدخل الرئيسي', },
      { path: '/diwan/library', ar: 'مكتبة الديوان', note: 'الشعراء والقصائد', },
      { path: '/archive', ar: 'الأرشيف', note: 'المحفوظات والقراءة', },
      { path: '/pkm', ar: 'الذاكرة', note: 'الملاحظات والخرائط', },
    ],
  },
  {
    key: 'games',
    path: '/games',
    icon: MkDice,
    caption: 'GAMES',
    cat: 'play',
    label: 'الألعاب',
    description: 'شطرنج، سودوكو، وتركيز',
    links: [
      { path: '/games', ar: 'صالة الألعاب', note: 'كل الألعاب', },
      { path: '/games/chess', ar: 'الشطرنج', note: 'مباريات وألغاز', },
      { path: '/games/sudoku', ar: 'سودوكو', note: 'أربع درجات', },
      { path: '/games/focus', ar: 'التركيز', note: 'تدريب الانتباه', },
    ],
  },
];

const CATS: { key: Cat; ar: string; }[] = [
  { key: 'all', ar: 'الكل', },
  { key: 'spirit', ar: 'الروح', },
  { key: 'body', ar: 'الجسد', },
  { key: 'mind', ar: 'العقل', },
  { key: 'play', ar: 'اللعب', },
];

/* ── page ─────────────────────────────────────────────────────────── */

export default function Portal() {
  const navigate = useNavigate();
  const { theme, setTheme, dir } = useApp();
  const { user, username, profile } = useAuth();
  const { unreadCount } = useUnreadMessages();
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
  }, [cat, measurePill]);

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
      `مقترح: ${pick.label}`,
    );
  };

  const tiles: AppTileDef[] = visible.map(a => ({
    key: a.key,
    path: a.path,
    icon: a.icon,
    caption: a.caption,
    cat: a.cat,
    label: a.label,
    description: a.description,
  }));

  const hh = String(clock.getHours()).padStart(2, '0');
  const mm = String(clock.getMinutes()).padStart(2, '0');
  const dateLine = clock.toLocaleDateString('ar', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const Chevron = rtl ? MkChevronPrev : MkChevronNext;
  const ChevronBack = rtl ? MkChevronNext : MkChevronPrev;

  /* ── shared fragments ── */

  const summaryBlock = (
    <>
      <div className="mk-sum">{'الوقت الآن'}</div>
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
        <span>{'افتح الرئيسي'}</span>
        <MkArrow size={18} />
      </button>
      <button className="mk-save-row" onClick={() => navigate('/settings')}>
        <MkBookmark size={18} />
        {'الإعدادات والتفضيلات'}
      </button>
    </>
  );

  return (
    <div className="mk">
      <SEO
        title="amv.life — بوابتك الشخصية"
        description="بوابة amv.life الشخصية: الرئيسي، المحراب، العافية، الدردشة، اطلاع، المعرفة، والألعاب — تطبيقات متكاملة في مكان واحد."
        path="/"
      />

      <div className="mk-app">
        <h1 className="sr-only">
          {'amv.life — بوابتك الشخصية'}
        </h1>

        <div className="mk-frame">
          {/* ============ RAIL (desktop) ============ */}
          <aside className="mk-rail">
            <div className="mk-logo">
              <MkLogo size={24} />
              <b>AMV.LIFE</b>
            </div>

            <div className="mk-side-label">{'التطبيقات'}</div>
            <nav className="mk-snav">
              {APPS.map(a => (
                <button
                  key={a.key}
                  className={selected === a.key ? 'on' : undefined}
                  onClick={() => setSelected(a.key)}
                  onDoubleClick={() => navigate(a.path)}
                >
                  <a.icon className="mk-ic" size={20} />
                  {a.label}
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
                  aria-label={'تبديل السمة'}
                >
                  {isDark ? <MkMoon size={18} /> : <MkSun size={19} />}
                </button>

                {user && (
                  <button
                    className="mk-icon-btn"
                    onClick={() => navigate('/chat')}
                    aria-label={'المحادثات'}
                  >
                    <MkMessage size={20} />
                    {unreadCount > 0 && <span className="mk-badge">{unreadCount}</span>}
                  </button>
                )}

                <button
                  className="mk-avatar"
                  onClick={() => setAcctOpen(v => !v)}
                  aria-label={'الحساب'}
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
                      {user ? ('مسجّل الدخول باسم') : 'زائر'}
                      <b>{user ? username || user.email : 'بدون حساب'}</b>
                    </div>
                    {user ? (
                      <>
                        <button onClick={() => navigate('/profile')}>
                          {'الملف الشخصي'}
                        </button>
                        <button onClick={() => navigate('/settings')}>
                          {'الإعدادات'}
                        </button>
                        <button onClick={() => navigate('/settings/theme')}>
                          {'السمة والألوان'}
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => navigate('/auth')}>
                          {'تسجيل الدخول'}
                        </button>
                        <button onClick={() => navigate('/settings')}>
                          {'الإعدادات'}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </header>

            <div className="mk-content">
              {/* Compact greeting strip — sits under the top bar, above
                  the filter pills so it never shifts with the grid. */}
              <div className="mk-greet">
                <span className="mk-greet-kicker">
                  {'بوابة شخصية'}
                </span>
                <span className="mk-greet-sep" aria-hidden>·</span>
                <span className="mk-greet-name">
                  {username
                    ? `أهلاً ${username}`
                    : 'أهلاً بك'}
                </span>
              </div>

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
                        {c.ar}
                      </button>
                    ))}
                  </div>

                  {/* view mode toggle — inline top-end, next to pills */}
                  <div className="mk-toolbar">
                    <button
                      onClick={() => setList(v => !v)}
                      className={list ? 'on' : undefined}
                      title={'طريقة العرض'}
                      aria-label={'طريقة العرض'}
                    >
                      {list ? <MkListView size={18} /> : <MkGridView size={18} />}
                    </button>
                  </div>

                  <div className="mk-stage-scroll">
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
                </div>
              </div>

            </div>

            <div className="mk-foot">
              <div className="rule" />
              <span>
                {'صنع بحب — عامر و امولة'}
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
