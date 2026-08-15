import { AnimatePresence,motion } from 'framer-motion';
import React, { useCallback, useEffect, useMemo,useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import BackButton from '@/components/BackButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import {
AlertTriangle,   Check, Copy, ImagePlus, LogOut, Palette,
Pencil, Shield,
Sparkles,   UserCircle, } from '@/lib/icons';
import { pageItem as item,pageStagger as stagger } from '@/lib/motion';
import { isUsernameAvailable, updateProfileAndAuth, uploadAvatar } from '@/services/supabase/profiles';
import { getDefaultAvatarForUser } from '@/utils/defaultAvatar';
import { EMOJI_AVATARS, getAppleEmojiUrl,isEmojiAvatarValue } from '@/utils/emojiAvatar';

// ── Cover themes ──────────────────────────────────────────────────────
// Six curated gradients tuned to the Obsidian Cinematic palette. Stored
// locally per-user so it's a pure client-side personalization (no DB
// migration needed) — the profile still feels bespoke without expanding
// scope.
type CoverTheme = {
  id: string;
  labelAr: string;
  css: string;
};
const COVER_THEMES: CoverTheme[] = [
  { id: 'copper', labelAr: 'نحاسي', css: 'hsl(var(--card))' },
  { id: 'obsidian', labelAr: 'أوبسيديان', css: 'hsl(var(--background))' },
  { id: 'ember', labelAr: 'جمر', css: 'hsl(var(--secondary))' },
  { id: 'moss', labelAr: 'طحلبي', css: 'hsl(var(--muted))' },
  { id: 'indigo', labelAr: 'نيلي', css: 'hsl(var(--accent))' },
  { id: 'sand', labelAr: 'رملي', css: 'hsl(var(--card))' },
];

const coverKey = (uid?: string) => `profile_cover_theme:${uid || 'anon'}`;

export default function ProfileEditPage() {
  const { user, loading, username: authUsername, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const [newUsername, setNewUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(EMOJI_AVATARS[0].emoji);
  const [bio, setBio] = useState('');
  const [coverThemeId, setCoverThemeId] = useState<string>('copper');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChanged, setUsernameChanged] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Snapshot of initial values so we can detect a dirty state and surface
  // a floating save bar when — and only when — something changed.
  const [initial, setInitial] = useState({
    username: '', displayName: '', avatar: '', bio: '',
  });

  const isUrlAvatar = selectedAvatar.startsWith('http');

  const draftKey = useMemo(() => `profile:draft:${user?.id || 'anon'}`, [user?.id]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    if (profile) {
      const u = profile.username || authUsername || '';
      const d = profile.display_name || '';
      const a = profile.avatar_url || EMOJI_AVATARS[0].emoji;
      const b = (profile as any).bio || '';
      setInitial({ username: u, displayName: d, avatar: a, bio: b });

      // Check if there is an unsaved draft in localStorage
      try {
        const storedDraft = localStorage.getItem(draftKey);
        if (storedDraft) {
          const draft = JSON.parse(storedDraft);
          setNewUsername(draft.username ?? u);
          setDisplayName(draft.displayName ?? d);
          setSelectedAvatar(draft.avatar ?? a);
          setBio(draft.bio ?? b);
          setUsernameAvailable(true);
          return;
        }
      } catch { /* ignore */ }

      setNewUsername(u);
      setDisplayName(d);
      setSelectedAvatar(a);
      setBio(b);
      setUsernameAvailable(true);
    } else if (authUsername) {
      setNewUsername(authUsername);
      setUsernameAvailable(true);
    }
  }, [user, loading, profile, authUsername, navigate, draftKey]);

  // Persist draft to localStorage on any state modification
  useEffect(() => {
    if (!user || loading) return;
    const isActuallyDirty =
      newUsername.toLowerCase().trim() !== initial.username.toLowerCase() ||
      displayName.trim() !== initial.displayName ||
      selectedAvatar !== initial.avatar ||
      bio.trim() !== initial.bio;

    if (isActuallyDirty) {
      const draft = {
        username: newUsername,
        displayName,
        avatar: selectedAvatar,
        bio,
      };
      try {
        localStorage.setItem(draftKey, JSON.stringify(draft));
      } catch { /* ignore */ }
    } else {
      try {
        localStorage.removeItem(draftKey);
      } catch { /* ignore */ }
    }
  }, [newUsername, displayName, selectedAvatar, bio, initial, user, loading, draftKey]);

  // Restore cover theme from localStorage once we know the user id.
  useEffect(() => {
    if (!user) return;
    try {
      const stored = localStorage.getItem(coverKey(user.id));
      if (stored && COVER_THEMES.some(t => t.id === stored)) setCoverThemeId(stored);
    } catch { /* ignore */ }
  }, [user]);

  const activeCover = useMemo(
    () => COVER_THEMES.find(t => t.id === coverThemeId) || COVER_THEMES[0],
    [coverThemeId],
  );

  const applyCover = (id: string) => {
    setCoverThemeId(id);
    try { if (user) localStorage.setItem(coverKey(user.id), id); } catch { /* ignore */ }
  };

  const isDirty =
    newUsername.toLowerCase().trim() !== initial.username.toLowerCase() ||
    displayName.trim() !== initial.displayName ||
    selectedAvatar !== initial.avatar ||
    bio.trim() !== initial.bio;

  const checkUsername = useCallback(async (name: string) => {
    if (!name.trim() || name.trim().length < 3) {
      if (isMountedRef.current) setUsernameAvailable(null);
      return;
    }
    if (name.toLowerCase().trim() === (profile?.username || authUsername || '').toLowerCase()) {
      if (isMountedRef.current) setUsernameAvailable(true);
      return;
    }
    if (isMountedRef.current) setCheckingUsername(true);
    try {
      const available = await isUsernameAvailable(name);
      if (isMountedRef.current) setUsernameAvailable(available);
    } catch {
      if (isMountedRef.current) setUsernameAvailable(false);
    } finally {
      if (isMountedRef.current) setCheckingUsername(false);
    }
  }, [profile, authUsername]);

  useEffect(() => {
    const timer = setTimeout(() => checkUsername(newUsername), 500);
    return () => clearTimeout(timer);
  }, [newUsername, checkUsername]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار صورة');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('الحد الأقصى 2 ميجابايت');
      return;
    }

    setUploading(true);
    try {
      const publicUrl = await uploadAvatar(user.id, file);
      if (isMountedRef.current) {
        setSelectedAvatar(publicUrl);
      }
      toast.success('تم رفع الصورة');
    } catch (err: any) {
      toast.error('فشل رفع الصورة');
      console.error(err);
    } finally {
      if (isMountedRef.current) {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!newUsername.trim() || newUsername.trim().length < 3) {
      toast.error('اسم المستخدم يجب أن يكون 3 أحرف على الأقل');
      return;
    }
    if (usernameAvailable === false) {
      toast.error('اسم المستخدم مستخدم بالفعل');
      return;
    }

    setSaving(true);
    try {
      await updateProfileAndAuth(user.id, {
        username: newUsername.toLowerCase().trim(),
        display_name: displayName.trim() || null,
        avatar_url: selectedAvatar,
        bio: bio.trim() || null,
      });

      await refreshProfile();
      toast.success('تم حفظ الملف الشخصي');
      try {
        localStorage.removeItem(draftKey);
      } catch { /* ignore */ }
      if (isMountedRef.current) {
        setInitial({
          username: newUsername.toLowerCase().trim(),
          displayName: displayName.trim(),
          avatar: selectedAvatar,
          bio: bio.trim(),
        });
      }
    } catch (err: any) {
      if (err?.message?.includes('duplicate') || err?.message?.includes('unique')) {
        toast.error('اسم المستخدم مستخدم بالفعل');
      } else {
        toast.error('حدث خطأ');
      }
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
        setUsernameChanged(false);
      }
    }
  };

  // ── Derived UI helpers ─────────────────────────────────────────────
  const memberSince = useMemo(() => {
    const createdAt = (profile as any)?.created_at || user?.created_at;
    if (!createdAt) return null;
    try {
      const d = new Date(createdAt);
      return d.toLocaleDateString('ar', { year: 'numeric', month: 'short' });
    } catch { return null; }
  }, [profile, user]);

  const lastSeenLabel = useMemo(() => {
    const ls = (profile as any)?.last_seen;
    if (!ls) return 'متصل الآن';
    try {
      const t = new Date(ls).getTime();
      const diff = Date.now() - t;
      if (diff < 60_000) return 'متصل الآن';
      const mins = Math.floor(diff / 60_000);
      if (mins < 60) return `آخر ظهور قبل ${mins} د`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `آخر ظهور قبل ${hrs} س`;
      const days = Math.floor(hrs / 24);
      return `آخر ظهور قبل ${days} يوم`;
    } catch { return ''; }
  }, [profile]);

  const copyProfileLink = async () => {
    try {
      const url = `${window.location.origin}/u/${(profile?.username || authUsername || '').toLowerCase()}`;
      await navigator.clipboard.writeText(url);
      toast.success('تم نسخ رابط الملف');
    } catch {
      toast.error('تعذّر النسخ');
    }
  };

  const resetAvatarToDefault = () => {
    setSelectedAvatar(getDefaultAvatarForUser(newUsername || 'U'));
  };

  const handleSignOut = async () => {
    setShowLogoutConfirm(false);
    await signOut();
    toast.success('تم تسجيل الخروج');
    navigate('/', { replace: true });
  };

  // ── Section: card wrapper with subtle Obsidian depth ───────────────
  const Section: React.FC<{
    icon: React.ComponentType<any>;
    title: string;
    hint?: string;
    children: React.ReactNode;
  }> = ({ icon: Icon, title, hint, children }) => (
    <motion.section variants={item} className="surface-depth rounded-2xl p-5 space-y-4">
      <header className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-[18px] h-[18px] text-primary stroke-[1.8]" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-meta font-bold text-foreground leading-tight">{title}</h2>
          {hint && <p className="text-micro text-muted-foreground/80 mt-0.5">{hint}</p>}
        </div>
      </header>
      {children}
    </motion.section>
  );

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-40 relative overflow-x-hidden" dir={'rtl'}>
      {/* Hero cover — full-width gradient with a slow ambient breath. The
          avatar and identity sit over it so the profile feels like its
          own destination, not a settings row. */}
      <div className="relative h-[220px] w-full overflow-hidden">
        <motion.div
          key={activeCover.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
          style={{ background: activeCover.css }}
        />
        {/* Ambient breath — subtle copper halo */}
        <motion.div
          aria-hidden
          className="absolute -inset-16 pointer-events-none"
          style={{ background: 'hsl(var(--primary) / 0.08)' }}
          animate={{ opacity: [0.55, 0.9, 0.55] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        {/* Fade to bg */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-background/80 pointer-events-none" />

        {/* Back button anchored to the safe top */}
        <div className="absolute top-3 start-4 z-raised">
          <BackButton fallback="/" />
        </div>
        {/* Copy link chip */}
        <button
          onClick={copyProfileLink}
          className="absolute top-4 end-4 z-raised flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 ring-1 ring-white/10 text-micro text-white/90 active:scale-95 transition-transform"
          aria-label={'نسخ رابط الملف'}
        >
          <Copy className="w-3.5 h-3.5" />
          {'نسخ الرابط'}
        </button>
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative -mt-[72px] px-5 max-w-lg mx-auto space-y-5"
      >
        {/* Identity block over the cover */}
        <motion.div variants={item} className="flex flex-col items-center text-center">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative group active:scale-[0.97] transition-transform"
            aria-label={'تغيير الصورة'}
          >
            <div className="w-[108px] h-[108px] rounded-full ring-4 ring-background bg-card shadow-lg overflow-hidden flex items-center justify-center">
              {isUrlAvatar ? (
                <img src={selectedAvatar} alt="" className="w-full h-full object-cover" />
              ) : isEmojiAvatarValue(selectedAvatar) ? (
                <img src={getAppleEmojiUrl(selectedAvatar) || ''} alt="" className="w-16 h-16" />
              ) : (
                <img src={getDefaultAvatarForUser(newUsername || 'U')} alt="" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="absolute -bottom-1 end-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center ring-4 ring-background">
              {uploading ? (
                <span className="animate-spin w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
              ) : (
                <Pencil className="w-3.5 h-3.5 text-primary-foreground" />
              )}
            </div>
          </button>

          <h1 className="mt-4 text-display font-bold text-foreground leading-tight tracking-tight">
            {displayName || newUsername || ('المستخدم')}
          </h1>
          <p className="text-mini text-muted-foreground mt-0.5" dir="ltr">
            @{newUsername || '—'}
          </p>

          {bio.trim() && (
            <p className="mt-3 text-mini leading-relaxed text-foreground/80 max-w-[26rem] italic" dir="auto">
              "{bio.trim()}"
            </p>
          )}

          {/* Presence + member-since chips */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/25 text-micro text-emerald-400">
              <span className="relative flex w-1.5 h-1.5">
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                <span className="relative rounded-full bg-emerald-400 w-1.5 h-1.5" />
              </span>
              {lastSeenLabel}
            </span>
            {memberSince && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/40 ring-1 ring-border/40 text-micro text-muted-foreground">
                <Sparkles className="w-3 h-3" />
                {`عضو منذ ${memberSince}`}
              </span>
            )}
          </div>
        </motion.div>

        {/* ── Cover theme ───────────────────────────────────────────── */}
        <Section
          icon={Palette}
          title={'ثيم الغلاف'}
          hint={'خلفية ملفك — اختيار محلي على هذا الجهاز'}
        >
          <div className="grid grid-cols-3 gap-2.5">
            {COVER_THEMES.map((t) => {
              const active = coverThemeId === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => applyCover(t.id)}
                  className={`relative h-16 rounded-xl overflow-hidden ring-1 transition-all active:scale-95 ${
                    active ? 'ring-2 ring-primary scale-[1.02]' : 'ring-border/40 hover:ring-primary/40'
                  }`}
                  style={{ background: t.css }}
                  aria-label={t.labelAr}
                >
                  {active && (
                    <div className="absolute top-1.5 end-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                  <span className="absolute bottom-1.5 start-2 rounded-md bg-black/70 px-1.5 py-0.5 text-micro font-medium text-white">
                    {t.labelAr}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        {/* ── Avatar ────────────────────────────────────────────────── */}
        <Section
          icon={ImagePlus}
          title={'الصورة الشخصية'}
          hint={'اختر رمزاً أو ارفع صورتك'}
        >
          <div className="grid grid-cols-4 gap-2">
            {EMOJI_AVATARS.map((animal) => {
              const isSelected = selectedAvatar === animal.emoji;
              return (
                <button
                  key={animal.id}
                  onClick={() => setSelectedAvatar(animal.emoji)}
                  className={`relative flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all duration-200 ${
                    isSelected
                      ? 'bg-primary/10 ring-2 ring-primary scale-[1.03]'
                      : 'bg-muted/30 ring-1 ring-border/40 active:scale-95'
                  }`}
                >
                  <img src={getAppleEmojiUrl(animal.emoji) || ''} alt={animal.label} className="w-8 h-8" loading="lazy" />
                  <span className="text-micro text-muted-foreground">{animal.label}</span>
                  {isSelected && (
                    <div className="absolute top-1 end-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-primary-foreground" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <span className="animate-spin w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full" />
              ) : (
                <>
                  <ImagePlus className="w-4 h-4" />
                  {'رفع صورة'}
                </>
              )}
            </Button>
            <Button variant="ghost" className="w-full gap-2" onClick={resetAvatarToDefault}>
              <UserCircle className="w-4 h-4" />
              {'افتراضي'}
            </Button>
          </div>
        </Section>

        {/* ── Identity ──────────────────────────────────────────────── */}
        <Section
          icon={Shield}
          title={'الهوية'}
          hint={'اسم مستخدم فريد — يظهر في المحادثات والرابط العام'}
        >
          <div className="space-y-2">
            <label className="text-mini font-semibold text-muted-foreground">
              {'اسم المستخدم'}
            </label>
            <div className="relative">
              <span className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground text-meta">@</span>
              <Input
                value={newUsername}
                onChange={(e) => {
                  setNewUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase());
                  setUsernameChanged(true);
                }}
                placeholder={'اسم المستخدم'}
                className="ps-8"
                dir="ltr"
                maxLength={20}
              />
            </div>
            <AnimatePresence>
              {usernameChanged && newUsername.trim().length >= 3 && (
                <motion.p
                  initial={{ opacity: 0, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`text-micro ${
                    checkingUsername
                      ? 'text-muted-foreground'
                      : usernameAvailable
                        ? 'text-emerald-400'
                        : 'text-destructive'
                  }`}
                >
                  {checkingUsername
                    ? ('جاري التحقق…')
                    : usernameAvailable
                      ? ('✓ متاح')
                      : ('✗ مستخدم بالفعل')}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </Section>

        {/* ── About ─────────────────────────────────────────────────── */}
        <Section
          icon={Pencil}
          title={'التعريف'}
          hint={'الاسم الظاهر والنبذة — ما يراه الآخرون'}
        >
          <div className="space-y-2">
            <label className="text-mini font-semibold text-muted-foreground">
              {'الاسم الظاهر'}
            </label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={'الاسم الذي يراه الآخرون'}
              maxLength={30}
            />
          </div>

          <div className="space-y-2">
            <label className="text-mini font-semibold text-muted-foreground">
              {'النبذة'}
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={'اكتب شيئاً عن نفسك…'}
              maxLength={150}
              rows={3}
              dir="auto"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-meta ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
            <p className="text-micro text-muted-foreground text-end">{bio.length}/150</p>
          </div>
        </Section>

        {/* ── Danger zone ───────────────────────────────────────────── */}
        <motion.section variants={item} className="rounded-2xl border border-destructive/20 bg-destructive/[0.04] p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
              <LogOut className="w-[18px] h-[18px] text-destructive" />
            </div>
            <div>
              <h2 className="text-meta font-bold text-foreground">
                {'تسجيل الخروج'}
              </h2>
              <p className="text-micro text-muted-foreground/80">
                {'إنهاء الجلسة على هذا الجهاز'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full py-2.5 rounded-xl bg-destructive/10 text-destructive text-mini font-semibold active:scale-[0.98] transition-transform"
          >
            {'تسجيل الخروج'}
          </button>
        </motion.section>
      </motion.div>

      {/* Floating save bar — appears only when dirty */}
      <AnimatePresence>
        {isDirty && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="fixed inset-x-0 bottom-4 z-float px-4 pointer-events-none"
          >
            <div className="max-w-lg mx-auto pointer-events-auto">
              <div className="surface-depth rounded-2xl px-3 py-2.5 flex items-center gap-3 shadow-2xl ring-1 ring-primary/20">
                <span className="text-mini text-muted-foreground flex-1 truncate">
                  {'لديك تغييرات غير محفوظة'}
                </span>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || usernameAvailable === false || checkingUsername}
                  className="gap-1.5"
                >
                  {saving ? (
                    <span className="animate-spin w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {'حفظ'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logout confirmation */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-drawer flex items-center justify-center bg-black/50 px-6"
            onClick={() => setShowLogoutConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-card border border-border p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <h3 className="text-lead font-bold text-foreground">
                  {'تسجيل الخروج'}
                </h3>
              </div>
              <p className="text-meta text-muted-foreground leading-relaxed">
                {'سيتم مسح بيانات هذا الجهاز محلياً. يمكنك استعادتها عند تسجيل الدخول مرة أخرى.'}
              </p>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-meta font-medium active:scale-[0.98] transition-transform"
                >
                  {'إلغاء'}
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-meta font-medium active:scale-[0.98] transition-transform"
                >
                  {'تسجيل الخروج'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
