import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserCircle, Check, Pencil, Camera, ImagePlus } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const EMOJI_AVATARS = [
  { id: 'fox', emoji: '🦊', label: 'ثعلب' },
  { id: 'cat', emoji: '🐱', label: 'قطة' },
  { id: 'owl', emoji: '🦉', label: 'بومة' },
  { id: 'wolf', emoji: '🐺', label: 'ذئب' },
  { id: 'bear', emoji: '🐻', label: 'دب' },
  { id: 'lion', emoji: '🦁', label: 'أسد' },
  { id: 'eagle', emoji: '🦅', label: 'نسر' },
  { id: 'dolphin', emoji: '🐬', label: 'دلفين' },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as const } },
};

export default function ProfileEditPage() {
  const { language } = useApp();
  const { user, loading, username: authUsername, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const isAr = language === 'ar';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newUsername, setNewUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(EMOJI_AVATARS[0].emoji);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  const isEmojiAvatar = EMOJI_AVATARS.some(a => a.emoji === selectedAvatar);
  const isUrlAvatar = selectedAvatar.startsWith('http');

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    if (profile) {
      setNewUsername(profile.username || authUsername || '');
      setDisplayName(profile.display_name || '');
      setSelectedAvatar(profile.avatar_url || EMOJI_AVATARS[0].emoji);
      setUsernameAvailable(true); // Current username is already theirs
    } else if (authUsername) {
      setNewUsername(authUsername);
      setUsernameAvailable(true);
    }
  }, [user, loading, profile, authUsername, navigate]);

  const checkUsername = useCallback(async (name: string) => {
    if (!name.trim() || name.trim().length < 3) {
      setUsernameAvailable(null);
      return;
    }
    if (name.toLowerCase().trim() === (profile?.username || authUsername || '').toLowerCase()) {
      setUsernameAvailable(true);
      return;
    }
    setCheckingUsername(true);
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', name.toLowerCase().trim())
      .maybeSingle();
    setUsernameAvailable(!data);
    setCheckingUsername(false);
  }, [profile, authUsername]);

  useEffect(() => {
    const timer = setTimeout(() => checkUsername(newUsername), 500);
    return () => clearTimeout(timer);
  }, [newUsername, checkUsername]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error(isAr ? 'يرجى اختيار صورة' : 'Bitte ein Bild auswählen');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error(isAr ? 'الحد الأقصى 2 ميجابايت' : 'Maximal 2 MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const filePath = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Add cache-busting param
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setSelectedAvatar(publicUrl);
      toast.success(isAr ? 'تم رفع الصورة' : 'Bild hochgeladen');
    } catch (err: any) {
      toast.error(isAr ? 'فشل رفع الصورة' : 'Upload fehlgeschlagen');
      console.error(err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!newUsername.trim() || newUsername.trim().length < 3) {
      toast.error(isAr ? 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' : 'Benutzername muss mindestens 3 Zeichen lang sein');
      return;
    }
    if (usernameAvailable === false) {
      toast.error(isAr ? 'اسم المستخدم مستخدم بالفعل' : 'Benutzername bereits vergeben');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: newUsername.toLowerCase().trim(),
          display_name: displayName.trim() || null,
          avatar_url: selectedAvatar,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      await supabase.auth.updateUser({
        data: { username: newUsername.toLowerCase().trim() },
      });

      await refreshProfile();
      toast.success(isAr ? 'تم حفظ الملف الشخصي' : 'Profil gespeichert');
      navigate('/settings');
    } catch (err: any) {
      if (err?.message?.includes('duplicate') || err?.message?.includes('unique')) {
        toast.error(isAr ? 'اسم المستخدم مستخدم بالفعل' : 'Benutzername bereits vergeben');
      } else {
        toast.error(isAr ? 'حدث خطأ' : 'Ein Fehler ist aufgetreten');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-28 px-5 pt-14">
      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-5 max-w-lg mx-auto">
        {/* Header */}
        <motion.div variants={item} className="flex items-center gap-3 mb-2">
          <BackButton to="/settings" />
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <UserCircle className="w-5 h-5 text-primary stroke-[1.8]" />
          </div>
          <h1 className="text-[26px] font-bold tracking-tight text-foreground">
            {isAr ? 'الملف الشخصي' : 'Profil'}
          </h1>
        </motion.div>

        {/* Avatar Selection */}
        <motion.div variants={item} className="bg-card border border-border/40 rounded-2xl p-5">
          <p className="text-[13px] font-semibold text-foreground mb-4">
            {isAr ? 'صورة الملف الشخصي' : 'Profilbild'}
          </p>

          {/* Current avatar preview */}
          <div className="flex justify-center mb-5">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-muted/30 ring-4 ring-primary/20 flex items-center justify-center overflow-hidden">
                {isUrlAvatar ? (
                  <img src={selectedAvatar} alt="Avatar" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <span className="text-5xl leading-none">{selectedAvatar}</span>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center border-2 border-card">
                <Pencil className="w-3 h-3 text-primary-foreground" />
              </div>
            </div>
          </div>

          {/* Emoji options */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {EMOJI_AVATARS.map((animal) => {
              const isSelected = selectedAvatar === animal.emoji;
              return (
                <button
                  key={animal.id}
                  onClick={() => setSelectedAvatar(animal.emoji)}
                  className={`relative flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all duration-200 ${
                    isSelected
                      ? 'bg-primary/10 ring-2 ring-primary scale-105'
                      : 'bg-muted/30 ring-1 ring-border/40 hover:ring-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <span className="text-3xl leading-none">{animal.emoji}</span>
                  <span className="text-[10px] text-muted-foreground">{animal.label}</span>
                  {isSelected && (
                    <div className="absolute top-1 end-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-primary-foreground" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Upload from device */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
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
                {isAr ? 'اختيار صورة من الجهاز' : 'Bild vom Gerät wählen'}
              </>
            )}
          </Button>
        </motion.div>

        {/* Username */}
        <motion.div variants={item} className="bg-card border border-border/40 rounded-2xl p-5 space-y-4">
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-foreground">
              {isAr ? 'اسم المستخدم (فريد)' : 'Benutzername (einzigartig)'}
            </label>
            <div className="relative">
              <span className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
              <Input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                placeholder={isAr ? 'اسم المستخدم' : 'benutzername'}
                className="ps-8"
                dir="ltr"
                maxLength={20}
              />
            </div>
            {newUsername.trim().length >= 3 && (
              <p className={`text-[11px] ${checkingUsername ? 'text-muted-foreground' : usernameAvailable ? 'text-green-500' : 'text-destructive'}`}>
                {checkingUsername
                  ? (isAr ? 'جاري التحقق...' : 'Wird geprüft...')
                  : usernameAvailable
                    ? (isAr ? '✓ متاح' : '✓ Verfügbar')
                    : (isAr ? '✗ مستخدم بالفعل' : '✗ Bereits vergeben')}
              </p>
            )}
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-foreground">
              {isAr ? 'الاسم الظاهر' : 'Anzeigename'}
            </label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={isAr ? 'الاسم الذي يراه الآخرون' : 'Name, den andere sehen'}
              maxLength={30}
            />
            <p className="text-[11px] text-muted-foreground">
              {isAr ? 'يمكنك استخدام أي لغة' : 'Jede Sprache möglich'}
            </p>
          </div>
        </motion.div>

        {/* Save Button */}
        <motion.div variants={item}>
          <Button
            onClick={handleSave}
            disabled={saving || usernameAvailable === false || checkingUsername}
            className="w-full gap-2"
          >
            {saving ? (
              <span className="animate-spin w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                {isAr ? 'حفظ التغييرات' : 'Änderungen speichern'}
              </>
            )}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
