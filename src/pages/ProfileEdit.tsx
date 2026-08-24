import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AvatarStudioModal } from '@/features/profile/components/AvatarStudioModal';
import { DigitalIdentityPassModal } from '@/features/profile/components/DigitalIdentityPassModal';
import { PhotoStudioModal } from '@/features/profile/components/PhotoStudioModal';
import { ProfileActivityMatrixTab } from '@/features/profile/components/ProfileActivityMatrixTab';
import { ProfileBadgesTab } from '@/features/profile/components/ProfileBadgesTab';
import { ProfileCompletionCard } from '@/features/profile/components/ProfileCompletionCard';
import { ProfileHeaderHero } from '@/features/profile/components/ProfileHeaderHero';
import { ProfileInsightsPanel } from '@/features/profile/components/ProfileInsightsPanel';
import { ProfileOverviewTab } from '@/features/profile/components/ProfileOverviewTab';
import { ProfilePrivacySettingsTab } from '@/features/profile/components/ProfilePrivacySettingsTab';
import { BadgeTelemetryPanel } from '@/features/profile/components/BadgeTelemetryPanel';
import { calculateProfileActivitySummary } from '@/features/profile/lib/activityAggregator';
import { generateInitialsAvatar } from '@/features/profile/lib/avatarStudioEngine';
import { evaluateProfileBadges } from '@/features/profile/lib/badgeEvaluator';
import { calculateProfileCompletion, ProfileData } from '@/features/profile/lib/profileCompletionEngine';
import { useUnifiedStreakDays } from '@/features/profile/lib/streakStore';
import { startBadgeAutoEvaluation, evaluateAndEmitBadges } from '@/features/profile/lib/badgeStore';
import { PrivacySettings, ProfileCompletionMetrics, SocialLinks } from '@/features/profile/types';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertTriangle,
  Check,
  Eye,
  Github,
  Linkedin,
  LogOut,
  Send,
  Sliders,
  Sparkles,
  Twitter,
  Wand2,
} from '@/lib/icons';
import { isUsernameAvailable, updateProfileAndAuth, uploadAvatar } from '@/services/supabase/profiles';
import { getDefaultAvatarForUser } from '@/utils/defaultAvatar';
import { EMOJI_AVATARS, getAppleEmojiUrl, isEmojiAvatarValue } from '@/utils/emojiAvatar';

type ProfileTab = 'overview' | 'activity' | 'edit' | 'badges' | 'privacy' | 'insights' | 'telemetry';

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

  // active tab state
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');

  // Form Field States
  const [newUsername, setNewUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(EMOJI_AVATARS[0].emoji);
  const [bio, setBio] = useState('');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [statusText, setStatusText] = useState('');
  const [statusEmoji, setStatusEmoji] = useState('✨');
  const [coverThemeId, setCoverThemeId] = useState<string>('obsidian');
  const [isPublic, setIsPublic] = useState(true);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    github: '',
    twitter: '',
    telegram: '',
    linkedin: '',
    instagram: '',
  });
  const [featuredBadges, setFeaturedBadges] = useState<string[]>(['badge_founding_member']);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    hide_activity: false,
    hide_location: false,
    hide_online_status: false,
  });

  // Action states
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChanged, setUsernameChanged] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  const [showAvatarStudio, setShowAvatarStudio] = useState(false);
  const [showPhotoStudio, setShowPhotoStudio] = useState(false);
  const [isVisitorPreview, setIsVisitorPreview] = useState(false);

  // Snapshot of initial values to detect dirty state & floating save bar
  const [initial, setInitial] = useState({
    username: '',
    displayName: '',
    avatar: '',
    bio: '',
    title: '',
    location: '',
    websiteUrl: '',
    statusText: '',
    statusEmoji: '✨',
    coverThemeId: 'obsidian',
    isPublic: true,
    socialLinksJson: '{}',
    featuredBadgesJson: '[]',
    privacySettingsJson: '{}',
  });

  const draftKey = useMemo(() => `profile:draft:${user?.id || 'anon'}`, [user?.id]);

  // Load profile data into state
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
      const t = (profile as any).title || '';
      const loc = (profile as any).location || '';
      const w = (profile as any).website_url || '';
      const st = (profile as any).status_text || '';
      const se = (profile as any).status_emoji || '✨';
      const cTheme = (profile as any).profile_theme || 'obsidian';
      const pub = (profile as any).is_public !== false;
      const soc = (profile as any).social_links || {};
      const fb = (profile as any).featured_badges || ['badge_founding_member'];
      const priv = (profile as any).privacy_settings || {
        hide_activity: false,
        hide_location: false,
        hide_online_status: false,
      };

      const initSnap = {
        username: u,
        displayName: d,
        avatar: a,
        bio: b,
        title: t,
        location: loc,
        websiteUrl: w,
        statusText: st,
        statusEmoji: se,
        coverThemeId: cTheme,
        isPublic: pub,
        socialLinksJson: JSON.stringify(soc),
        featuredBadgesJson: JSON.stringify(fb),
        privacySettingsJson: JSON.stringify(priv),
      };

      setInitial(initSnap);

      // Check for draft in localStorage
      try {
        const storedDraft = localStorage.getItem(draftKey);
        if (storedDraft) {
          const draft = JSON.parse(storedDraft);
          setNewUsername(draft.username ?? u);
          setDisplayName(draft.displayName ?? d);
          setSelectedAvatar(draft.avatar ?? a);
          setBio(draft.bio ?? b);
          setTitle(draft.title ?? t);
          setLocation(draft.location ?? loc);
          setWebsiteUrl(draft.websiteUrl ?? w);
          setStatusText(draft.statusText ?? st);
          setStatusEmoji(draft.statusEmoji ?? se);
          setCoverThemeId(draft.coverThemeId ?? cTheme);
          setIsPublic(draft.isPublic ?? pub);
          setSocialLinks(draft.socialLinks ?? soc);
          setFeaturedBadges(draft.featuredBadges ?? fb);
          setPrivacySettings(draft.privacySettings ?? priv);
          setUsernameAvailable(true);
          return;
        }
      } catch { /* ignore */ }

      setNewUsername(u);
      setDisplayName(d);
      setSelectedAvatar(a);
      setBio(b);
      setTitle(t);
      setLocation(loc);
      setWebsiteUrl(w);
      setStatusText(st);
      setStatusEmoji(se);
      setCoverThemeId(cTheme);
      setIsPublic(pub);
      setSocialLinks(soc);
      setFeaturedBadges(fb);
      setPrivacySettings(priv);
      setUsernameAvailable(true);
    } else if (authUsername) {
      setNewUsername(authUsername);
      setUsernameAvailable(true);
    }
  }, [user, loading, profile, authUsername, navigate, draftKey]);

  // Sync active cover theme from state
  const activeCoverCss = useMemo(() => {
    const themes = [
      { id: 'obsidian', css: 'linear-gradient(135deg, #111113 0%, #1a1a1e 100%)' },
      { id: 'copper', css: 'linear-gradient(135deg, #2b1a17 0%, #4a2820 100%)' },
      { id: 'emerald', css: 'linear-gradient(135deg, #0e271d 0%, #184232 100%)' },
      { id: 'amber', css: 'linear-gradient(135deg, #2f2110 0%, #4f361a 100%)' },
      { id: 'cobalt', css: 'linear-gradient(135deg, #101c2e 0%, #1d2f4a 100%)' },
      { id: 'velvet', css: 'linear-gradient(135deg, #221226 0%, #381b3f 100%)' },
    ];
    const theme = themes.find((t) => t.id === coverThemeId);
    return theme ? theme.css : themes[0].css;
  }, [coverThemeId]);

  // Compute dirty flag
  const isDirty = useMemo(() => {
    return (
      newUsername.toLowerCase().trim() !== initial.username.toLowerCase() ||
      displayName.trim() !== initial.displayName ||
      selectedAvatar !== initial.avatar ||
      bio.trim() !== initial.bio ||
      title.trim() !== initial.title ||
      location.trim() !== initial.location ||
      websiteUrl.trim() !== initial.websiteUrl ||
      statusText.trim() !== initial.statusText ||
      statusEmoji !== initial.statusEmoji ||
      coverThemeId !== initial.coverThemeId ||
      isPublic !== initial.isPublic ||
      JSON.stringify(socialLinks) !== initial.socialLinksJson ||
      JSON.stringify(featuredBadges) !== initial.featuredBadgesJson ||
      JSON.stringify(privacySettings) !== initial.privacySettingsJson
    );
  }, [
    newUsername,
    displayName,
    selectedAvatar,
    bio,
    title,
    location,
    websiteUrl,
    statusText,
    statusEmoji,
    coverThemeId,
    isPublic,
    socialLinks,
    featuredBadges,
    privacySettings,
    initial,
  ]);

  // Real cross-module activity summary and dynamic badge evaluation
  const activitySummary = useMemo(() => {
    return calculateProfileActivitySummary();
  }, []);

  // Live unified streak from the central store (recomputes on activity)
  const unifiedStreakDays = useUnifiedStreakDays();

  // Build ProfileData object for the completion engine
  const profileData = useMemo<ProfileData>(() => ({
    username: newUsername,
    displayName,
    avatar: selectedAvatar,
    bio,
    title,
    location,
    statusText,
    statusEmoji,
    websiteUrl,
    socialLinks,
    featuredBadges,
    coverThemeId,
    isPublic,
    privacySettings,
  }), [newUsername, displayName, selectedAvatar, bio, title, location, statusText, statusEmoji, websiteUrl, socialLinks, featuredBadges, coverThemeId, isPublic, privacySettings]);

  // Compute profile strength metrics using the new engine
  const completionMetrics = useMemo(() => {
    return calculateProfileCompletion(
      profileData,
      activitySummary,
      unifiedStreakDays ?? 0
    );
  }, [profileData, activitySummary, unifiedStreakDays]);

  const evaluatedBadges = useMemo(() => {
    return evaluateProfileBadges(
      activitySummary,
      completionMetrics.percentage,
      unifiedStreakDays ?? 0
    );
  }, [activitySummary, completionMetrics.percentage, unifiedStreakDays]);

  // Start real-time badge evaluation on mount
  useEffect(() => {
    if (!user) return;
    
    const stopEvaluation = startBadgeAutoEvaluation(
      () => calculateProfileActivitySummary(),
      () => completionMetrics.percentage,
      () => unifiedStreakDays ?? 0,
      60000 // 1 minute
    );
    
    // Initial evaluation
    evaluateAndEmitBadges(activitySummary, completionMetrics.percentage, unifiedStreakDays ?? 0);
    
    return () => stopEvaluation();
  }, [user, activitySummary, completionMetrics.percentage, unifiedStreakDays]);

  // Persist draft to localStorage when dirty
  useEffect(() => {
    if (!user || loading) return;
    if (isDirty) {
      const draft = {
        username: newUsername,
        displayName,
        avatar: selectedAvatar,
        bio,
        title,
        location,
        websiteUrl,
        statusText,
        statusEmoji,
        coverThemeId,
        isPublic,
        socialLinks,
        featuredBadges,
        privacySettings,
      };
      try {
        localStorage.setItem(draftKey, JSON.stringify(draft));
      } catch { /* ignore */ }
    } else {
      try {
        localStorage.removeItem(draftKey);
      } catch { /* ignore */ }
    }
  }, [
    isDirty,
    newUsername,
    displayName,
    selectedAvatar,
    bio,
    title,
    location,
    websiteUrl,
    statusText,
    statusEmoji,
    coverThemeId,
    isPublic,
    socialLinks,
    featuredBadges,
    privacySettings,
    user,
    loading,
    draftKey,
  ]);

  // Real-time username availability checker
  const checkUsername = useCallback(
    async (name: string) => {
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
    },
    [profile, authUsername]
  );

  useEffect(() => {
    const timer = setTimeout(() => checkUsername(newUsername), 500);
    return () => clearTimeout(timer);
  }, [newUsername, checkUsername]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('يرجى اختيار صورة صالحة');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('الحد الأقصى لحجم الصورة هو 2 ميجابايت');
      return;
    }

    setUploading(true);
    try {
      const publicUrl = await uploadAvatar(user.id, file);
      if (isMountedRef.current) {
        setSelectedAvatar(publicUrl);
      }
      toast.success('تم رفع الصورة الشخصية بنجاح');
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
      toast.error('اسم المستخدم يجب أن يتكون من 3 أحرف على الأقل');
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
        title: title.trim() || null,
        location: location.trim() || null,
        website_url: websiteUrl.trim() || null,
        social_links: socialLinks as unknown as Record<string, string | null>,
        status_text: statusText.trim() || null,
        status_emoji: statusEmoji || '✨',
        featured_badges: featuredBadges,
        profile_theme: coverThemeId,
        is_public: isPublic,
        privacy_settings: privacySettings as any,
      });

      await refreshProfile();
      toast.success('تم حفظ التعديلات والملف الشخصي بنجاح');

      try {
        localStorage.removeItem(draftKey);
      } catch { /* ignore */ }

      if (isMountedRef.current) {
        setInitial({
          username: newUsername.toLowerCase().trim(),
          displayName: displayName.trim(),
          avatar: selectedAvatar,
          bio: bio.trim(),
          title: title.trim(),
          location: location.trim(),
          websiteUrl: websiteUrl.trim(),
          statusText: statusText.trim(),
          statusEmoji,
          coverThemeId,
          isPublic,
          socialLinksJson: JSON.stringify(socialLinks),
          featuredBadgesJson: JSON.stringify(featuredBadges),
          privacySettingsJson: JSON.stringify(privacySettings),
        });
      }
    } catch (err: any) {
      toast.error('حدث خطأ أثناء حفظ التعديلات');
      console.error(err);
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
        setUsernameChanged(false);
      }
    }
  };

  const handleToggleFeaturedBadge = (badgeId: string) => {
    if (featuredBadges.includes(badgeId)) {
      setFeaturedBadges(featuredBadges.filter((id) => id !== badgeId));
      toast.info('تم إلغاء تثبيت الوسام');
    } else {
      if (featuredBadges.length >= 3) {
        toast.error('يمكنك تثبيت 3 أوسمة كحد أقصى في أعلى الملف');
        return;
      }
      setFeaturedBadges([...featuredBadges, badgeId]);
      toast.success('تم تثبيت الوسام في رأس الملف');
    }
  };

  // Privacy settings handlers
  const exportPrivacySettings = useCallback((settings: PrivacySettings) => {
    try {
      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `privacy-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('تم تصدير إعدادات الخصوصية');
    } catch {
      toast.error('فشل في تصدير الإعدادات');
    }
  }, []);

  const importPrivacySettings = useCallback((settings: PrivacySettings) => {
    try {
      // Validate required fields
      if (
        typeof settings.hide_activity === 'boolean' &&
        typeof settings.hide_location === 'boolean' &&
        typeof settings.hide_online_status === 'boolean'
      ) {
        setPrivacySettings(settings);
        toast.success('تم استيراد إعدادات الخصوصية');
      } else {
        toast.error('ملف الإعدادات غير صالح');
      }
    } catch {
      toast.error('فشل في استيراد الإعدادات');
    }
  }, []);

  const resetPrivacySettings = useCallback(() => {
    setPrivacySettings({
      hide_activity: false,
      hide_location: false,
      hide_online_status: false,
    });
    toast.success('تم إعادة تعيين إعدادات الخصوصية للوضع الافتراضي');
  }, []);

  const memberSince = useMemo(() => {
    const createdAt = (profile as any)?.created_at || user?.created_at;
    if (!createdAt) return null;
    try {
      const d = new Date(createdAt);
      return d.toLocaleDateString('ar', { year: 'numeric', month: 'short' });
    } catch {
      return null;
    }
  }, [profile, user]);

  const copyProfileLink = async () => {
    try {
      const url = `${window.location.origin}/u/${(newUsername || authUsername || '').toLowerCase()}`;
      await navigator.clipboard.writeText(url);
      toast.success('تم نسخ رابط الملف الشخصي');
    } catch {
      toast.error('تعذر نسخ الرابط');
    }
  };

  const handleSignOut = async () => {
    setShowLogoutConfirm(false);
    await signOut();
    toast.success('تم تسجيل الخروج بنجاح');
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background pb-36 relative overflow-x-hidden" dir="rtl">
      {/* 1. Header Hero with Animated Canvas & Circular Progress Ring */}
      <ProfileHeaderHero
        username={newUsername || authUsername || ''}
        displayName={displayName || newUsername || 'المستخدم'}
        avatarUrl={selectedAvatar}
        title={title}
        location={privacySettings.hide_location ? null : location}
        statusText={statusText}
        statusEmoji={statusEmoji}
        completionPercentage={completionMetrics.percentage}
        activeCoverCss={activeCoverCss}
        coverThemeId={coverThemeId}
        isUploadingAvatar={uploading}
        onAvatarClick={() => {
          setActiveTab('edit');
          fileInputRef.current?.click();
        }}
        onOpenPassModal={() => setShowPassModal(true)}
        onCopyLink={copyProfileLink}
        isOnline={!privacySettings.hide_online_status}
        memberSinceDate={memberSince}
      />

      {/* 2. Main Content Container */}
      <div className="max-w-xl mx-auto px-4 mt-6 space-y-5">
        {/* Profile Completion Checklist Gauge */}
        <ProfileCompletionCard
          metrics={completionMetrics}
          onActionClick={(tab) => setActiveTab(tab as ProfileTab)}
        />

        {/* Dynamic Tab Selector Bar */}
        <div className="flex items-center gap-1 bg-card border border-border/50 p-1.5 rounded-2xl overflow-x-auto no-scrollbar shadow-sm">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 min-w-[90px] py-2 rounded-xl text-micro font-bold transition-all ${
              activeTab === 'overview'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            التعريف
          </button>

          <button
            onClick={() => setActiveTab('activity')}
            className={`flex-1 min-w-[90px] py-2 rounded-xl text-micro font-bold transition-all ${
              activeTab === 'activity'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            سجل النشاط
          </button>

          <button
            onClick={() => setActiveTab('badges')}
            className={`flex-1 min-w-[90px] py-2 rounded-xl text-micro font-bold transition-all ${
              activeTab === 'badges'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            الأوسمة
          </button>

          <button
            onClick={() => setActiveTab('insights')}
            className={`flex-1 min-w-[90px] py-2 rounded-xl text-micro font-bold transition-all ${
              activeTab === 'insights'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            رؤى
          </button>

          <button
            onClick={() => setActiveTab('telemetry')}
            className={`flex-1 min-w-[90px] py-2 rounded-xl text-micro font-bold transition-all ${
              activeTab === 'telemetry'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            أداء
          </button>

          <button
            onClick={() => setActiveTab('edit')}
            className={`flex-1 min-w-[90px] py-2 rounded-xl text-micro font-bold transition-all ${
              activeTab === 'edit'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            تعديل الهوية
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex-1 min-w-[90px] py-2 rounded-xl text-micro font-bold transition-all ${
              activeTab === 'privacy'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            الخصوصية
          </button>
        </div>

        {/* Tab Views */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'overview' && (
            <ProfileOverviewTab
              bio={bio}
              title={title}
              location={location}
              websiteUrl={websiteUrl}
              socialLinks={socialLinks}
              statusText={statusText}
              statusEmoji={statusEmoji}
              featuredBadges={featuredBadges}
              onEditClick={() => setActiveTab('edit')}
              onNavigateToBadges={() => setActiveTab('badges')}
            />
          )}

          {activeTab === 'activity' && (
            <ProfileActivityMatrixTab summary={activitySummary} />
          )}

          {activeTab === 'badges' && (
            <ProfileBadgesTab
              badges={evaluatedBadges}
              featuredBadges={featuredBadges}
              onToggleFeaturedBadge={handleToggleFeaturedBadge}
            />
          )}

          {activeTab === 'privacy' && (
            <ProfilePrivacySettingsTab
              isPublic={isPublic}
              privacySettings={privacySettings}
              coverThemeId={coverThemeId}
              onTogglePublic={setIsPublic}
              onUpdatePrivacySetting={(key, val) =>
                setPrivacySettings({ ...privacySettings, [key]: val })
              }
              onSelectCoverTheme={setCoverThemeId}
              onExportSettings={exportPrivacySettings}
              onImportSettings={importPrivacySettings}
              onResetSettings={resetPrivacySettings}
            />
          )}

          {activeTab === 'insights' && (
            <ProfileInsightsPanel
              summary={activitySummary}
              badges={evaluatedBadges}
              completionMetrics={completionMetrics}
              onActionClick={(tab: string) => setActiveTab(tab as ProfileTab)}
            />
          )}

          {activeTab === 'telemetry' && (
            <BadgeTelemetryPanel />
          )}

          {activeTab === 'edit' && (
            <div className="space-y-5">
              {/* Real-time Interactive Live Preview Banner */}
              <div className="surface-depth rounded-2xl p-4 border border-primary/20 space-y-3 bg-gradient-to-r from-card via-card to-primary/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-meta font-extrabold text-foreground">المعاينة الحية للبروفايل</span>
                  </div>
                  <button
                    onClick={() => setIsVisitorPreview(!isVisitorPreview)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-micro font-bold transition-all ${
                      isVisitorPreview
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-primary/10 text-primary border border-primary/20'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{isVisitorPreview ? 'معاينة كزائر' : 'معاينة شخصية'}</span>
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-card border border-border/40 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full ring-2 ring-primary bg-background overflow-hidden shrink-0 flex items-center justify-center">
                    {selectedAvatar.startsWith('http') || selectedAvatar.startsWith('data:') ? (
                      <img src={selectedAvatar} alt="Preview" className="w-full h-full object-cover" />
                    ) : isEmojiAvatarValue(selectedAvatar) ? (
                      <img src={getAppleEmojiUrl(selectedAvatar) || ''} alt="Preview" className="w-8 h-8" />
                    ) : (
                      <img src={getDefaultAvatarForUser(newUsername || 'U')} alt="Preview" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-meta font-bold text-foreground truncate">
                      {displayName || newUsername || 'المستخدم'}
                    </h4>
                    <p className="text-micro font-mono text-muted-foreground" dir="ltr">
                      @{newUsername || 'user'}
                    </p>
                    {bio && <p className="text-micro text-muted-foreground line-clamp-1 italic mt-0.5">"{bio}"</p>}
                  </div>
                </div>
              </div>

              {/* Avatar Studio Creation Pathways */}
              <section className="surface-depth rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-meta font-bold text-foreground">استوديو الصور والهوية الرمزية</h2>
                    <p className="text-micro text-muted-foreground">اختر رمزاً تعبيرياً، ارفع صورة، أو اصنع هويتك المتجهة</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>

                {/* Studio Action Shortcuts */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <Button
                    variant="outline"
                    onClick={() => setShowAvatarStudio(true)}
                    className="gap-2 h-auto py-3 rounded-xl border-primary/30 hover:bg-primary/10 text-primary font-bold"
                  >
                    <Wand2 className="w-4 h-4" />
                    <div className="text-start">
                      <span className="block text-micro font-bold">استوديو المتجهات</span>
                      <span className="block text-[0.625rem] text-muted-foreground font-normal">Vector Avatar Studio</span>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setShowPhotoStudio(true)}
                    className="gap-2 h-auto py-3 rounded-xl font-bold"
                  >
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    <div className="text-start">
                      <span className="block text-micro font-bold">معالجة الصور</span>
                      <span className="block text-[0.625rem] text-muted-foreground font-normal">Photo Filter Studio</span>
                    </div>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      const initialsDataUri = generateInitialsAvatar((displayName || newUsername || 'U').slice(0, 2));
                      setSelectedAvatar(initialsDataUri);
                      toast.success('تم إنشاء صورة الحروف الأولى بنجاح');
                    }}
                    className="gap-2 h-auto py-3 rounded-xl sm:col-span-1 col-span-2 font-bold"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <div className="text-start">
                      <span className="block text-micro font-bold">رمز الحروف الأولى</span>
                      <span className="block text-[0.625rem] text-muted-foreground font-normal">Initials Stamp</span>
                    </div>
                  </Button>
                </div>

                {/* Apple HD Emojis Catalog */}
                <div className="pt-2 border-t border-border/30 space-y-2">
                  <span className="text-micro font-bold text-muted-foreground">مكتبة الرموز التعبيرية عالية الدقة</span>
                  <div className="grid grid-cols-4 gap-2">
                    {EMOJI_AVATARS.map((animal) => {
                      const isSelected = selectedAvatar === animal.emoji;
                      return (
                        <button
                          key={animal.id}
                          onClick={() => setSelectedAvatar(animal.emoji)}
                          className={`relative flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all ${
                            isSelected
                              ? 'bg-primary/10 ring-2 ring-primary scale-[1.03]'
                              : 'bg-muted/30 ring-1 ring-border/40 active:scale-95'
                          }`}
                        >
                          <img
                            src={getAppleEmojiUrl(animal.emoji) || ''}
                            alt={animal.label}
                            className="w-8 h-8"
                            loading="lazy"
                          />
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
                </div>
              </section>

              {/* Username & Handle */}
              <section className="surface-depth rounded-2xl p-5 space-y-4">
                <h2 className="text-meta font-bold text-foreground">اسم المستخدم والهوية الرقمية</h2>

                <div className="space-y-2">
                  <label className="text-mini font-semibold text-muted-foreground">اسم المستخدم الفريد (@)</label>
                  <div className="relative">
                    <span className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground text-meta">@</span>
                    <Input
                      value={newUsername}
                      onChange={(e) => {
                        setNewUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase());
                        setUsernameChanged(true);
                      }}
                      placeholder="username"
                      className="ps-8 font-mono"
                      dir="ltr"
                      maxLength={24}
                    />
                  </div>

                  <AnimatePresence>
                    {usernameChanged && newUsername.trim().length >= 3 && (
                      <motion.p
                        initial={{ opacity: 0, y: -2 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`text-micro font-semibold ${
                          checkingUsername
                            ? 'text-muted-foreground'
                            : usernameAvailable
                            ? 'text-emerald-400'
                            : 'text-destructive'
                        }`}
                      >
                        {checkingUsername
                          ? 'جاري التحقق من التوفر…'
                          : usernameAvailable
                          ? '✓ اسم المستخدم متاح'
                          : '✗ اسم المستخدم مُسجّل بالفعل'}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                <div className="space-y-2">
                  <label className="text-mini font-semibold text-muted-foreground">الاسم الظاهر</label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="الاسم الكامل أو اسم الشهرة"
                    maxLength={50}
                  />
                </div>
              </section>

              {/* Title, Location & Bio */}
              <section className="surface-depth rounded-2xl p-5 space-y-4">
                <h2 className="text-meta font-bold text-foreground">المسمى، الموقع والتعريف الشخصي</h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-mini font-semibold text-muted-foreground">المسمى / التخصص</label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="مثال: باحث لغوي، مهندس برمجيات"
                      maxLength={60}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-mini font-semibold text-muted-foreground">المدينة / الدولة</label>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="مثال: الرياض، المملكة العربية السعودية"
                      maxLength={60}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-mini font-semibold text-muted-foreground">النبذة التعريفية</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="اكتب نبذة موجزة تعبر عن شغفك واهتماماتك…"
                    maxLength={200}
                    rows={3}
                    dir="auto"
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-meta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  />
                  <p className="text-micro text-muted-foreground text-end">{bio.length}/200</p>
                </div>
              </section>

              {/* Status & Emoji */}
              <section className="surface-depth rounded-2xl p-5 space-y-4">
                <h2 className="text-meta font-bold text-foreground">الحالة الحالية والرمز التعبيري</h2>

                <div className="flex gap-2">
                  <Input
                    value={statusEmoji}
                    onChange={(e) => setStatusEmoji(e.target.value)}
                    placeholder="✨"
                    className="w-16 text-center text-lead"
                    maxLength={4}
                  />
                  <Input
                    value={statusText}
                    onChange={(e) => setStatusText(e.target.value)}
                    placeholder="ما الذي تحضر له الآن؟ (مثال: يعمل على مشروع جديد)"
                    maxLength={80}
                  />
                </div>
              </section>

              {/* Website & Social Links */}
              <section className="surface-depth rounded-2xl p-5 space-y-4">
                <h2 className="text-meta font-bold text-foreground">الموقع الشخصي وحسابات التواصل</h2>

                <div className="space-y-2">
                  <label className="text-mini font-semibold text-muted-foreground">الموقع الشخصي / المدونة</label>
                  <Input
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://example.com"
                    dir="ltr"
                    maxLength={150}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-micro font-semibold text-muted-foreground flex items-center gap-1">
                      <Github className="w-3.5 h-3.5" /> GitHub
                    </label>
                    <Input
                      value={socialLinks.github || ''}
                      onChange={(e) => setSocialLinks({ ...socialLinks, github: e.target.value })}
                      placeholder="username"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-micro font-semibold text-muted-foreground flex items-center gap-1">
                      <Twitter className="w-3.5 h-3.5" /> X (Twitter)
                    </label>
                    <Input
                      value={socialLinks.twitter || ''}
                      onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })}
                      placeholder="username"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-micro font-semibold text-muted-foreground flex items-center gap-1">
                      <Send className="w-3.5 h-3.5" /> Telegram
                    </label>
                    <Input
                      value={socialLinks.telegram || ''}
                      onChange={(e) => setSocialLinks({ ...socialLinks, telegram: e.target.value })}
                      placeholder="username"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-micro font-semibold text-muted-foreground flex items-center gap-1">
                      <Linkedin className="w-3.5 h-3.5" /> LinkedIn
                    </label>
                    <Input
                      value={socialLinks.linkedin || ''}
                      onChange={(e) => setSocialLinks({ ...socialLinks, linkedin: e.target.value })}
                      placeholder="username"
                      dir="ltr"
                    />
                  </div>
                </div>
              </section>

              {/* Danger Zone: Log Out */}
              <section className="rounded-2xl border border-destructive/20 bg-destructive/[0.04] p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
                    <LogOut className="w-[18px] h-[18px] text-destructive" />
                  </div>
                  <div>
                    <h2 className="text-meta font-bold text-foreground">تسجيل الخروج</h2>
                    <p className="text-micro text-muted-foreground">إنهاء الجلسة بأمان على هذا الجهاز</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full py-2.5 rounded-xl bg-destructive/10 text-destructive text-mini font-semibold active:scale-[0.98] transition-transform"
                >
                  تسجيل الخروج
                </button>
              </section>
            </div>
          )}
        </motion.div>
      </div>

      {/* Floating Save Bar when dirty */}
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
              <div className="surface-depth rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl ring-1 ring-primary/30">
                <span className="text-mini text-foreground font-semibold flex-1 truncate">
                  لديك تغييرات غير محفوظة في ملفك
                </span>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || usernameAvailable === false || checkingUsername}
                  className="gap-1.5 px-4 font-bold"
                >
                  {saving ? (
                    <span className="animate-spin w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      حفظ التغييرات
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar Studio Modal */}
      <AvatarStudioModal
        isOpen={showAvatarStudio}
        onClose={() => setShowAvatarStudio(false)}
        onSelectAvatar={(dataUri) => {
          setSelectedAvatar(dataUri);
          toast.success('تمت إضافة رمز الهوية الرقمية المتجة بنجاح');
        }}
      />

      {/* Photo Studio Modal */}
      <PhotoStudioModal
        isOpen={showPhotoStudio}
        onClose={() => setShowPhotoStudio(false)}
        onApplyPhoto={(dataUri) => {
          setSelectedAvatar(dataUri);
          toast.success('تم تطبيق المعالجة على الصورة بنجاح');
        }}
      />

      {/* Digital Identity Ticket Pass Modal */}
      <DigitalIdentityPassModal
        isOpen={showPassModal}
        onClose={() => setShowPassModal(false)}
        username={newUsername || authUsername || ''}
        displayName={displayName || newUsername || 'المستخدم'}
        avatarUrl={selectedAvatar}
        title={title}
        location={location}
        memberSinceDate={memberSince}
      />

      {/* Logout confirmation */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-drawer flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm"
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
                <h3 className="text-lead font-bold text-foreground">تسجيل الخروج</h3>
              </div>
              <p className="text-meta text-muted-foreground leading-relaxed">
                هل أنت تأكد من إغلاق الجلسة؟ سيتم حفظ كافة التغييرات المسجلة بحسابك.
              </p>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-meta font-medium active:scale-[0.98] transition-transform"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSignOut}
                  className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-meta font-medium active:scale-[0.98] transition-transform"
                >
                  تأكيد الخروج
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
