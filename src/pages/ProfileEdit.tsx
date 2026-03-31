import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserCircle, Check, Pencil } from 'lucide-react';
import BackButton from '@/components/BackButton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const ANIMAL_AVATARS = [
  { id: 'fox', label: 'ثعلب', colors: ['/avatars/fox_orange.png', '/avatars/fox_blue.png', '/avatars/fox_red.png'] },
  { id: 'cat', label: 'قطة', colors: ['/avatars/cat_purple.png', '/avatars/cat_gold.png', '/avatars/cat_black.png'] },
  { id: 'owl', label: 'بومة', colors: ['/avatars/owl_teal.png', '/avatars/owl_white.png', '/avatars/owl_brown.png'] },
  { id: 'dino', label: 'ديناصور', colors: ['/avatars/dino_green.png', '/avatars/dino_blue.png', '/avatars/dino_red.png'] },
  { id: 'wolf', label: 'ذئب', colors: ['/avatars/wolf_gray.png', '/avatars/wolf_black.png', '/avatars/wolf_white.png'] },
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

  const [newUsername, setNewUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(ANIMAL_AVATARS[0].colors[0]);
  const [selectedAnimal, setSelectedAnimal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    if (profile) {
      setNewUsername(profile.username || authUsername || '');
      setDisplayName(profile.display_name || '');
      setSelectedAvatar(profile.avatar_url || ANIMAL_AVATARS[0].colors[0]);
    } else if (authUsername) {
      setNewUsername(authUsername);
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

      // Also update auth metadata
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
              <div className="w-24 h-24 rounded-full bg-primary/10 ring-4 ring-primary/20 overflow-hidden flex items-center justify-center">
                <img
                  src={selectedAvatar}
                  alt="Avatar"
                  className="w-full h-full object-cover object-top"
                  loading="lazy"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center border-2 border-card">
                <Pencil className="w-3 h-3 text-primary-foreground" />
              </div>
            </div>
          </div>

          {/* Animal options */}
          <div className="flex justify-center gap-3 flex-wrap">
            {ANIMAL_AVATARS.map((animal) => {
              const isAnimalSelected = animal.colors.includes(selectedAvatar);
              return (
                <button
                  key={animal.id}
                  onClick={() => setSelectedAnimal(selectedAnimal === animal.id ? null : animal.id)}
                  className={`relative w-14 h-14 rounded-full overflow-hidden flex items-center justify-center transition-all duration-200 ${
                    isAnimalSelected
                      ? 'ring-[3px] ring-primary bg-primary/10 scale-110'
                      : selectedAnimal === animal.id
                        ? 'ring-[3px] ring-accent bg-accent/10 scale-105'
                        : 'ring-2 ring-border/40 bg-muted/30 hover:ring-primary/50'
                  }`}
                >
                  <img src={animal.colors[0]} alt={animal.label} className="w-full h-full object-cover object-top" loading="lazy" />
                  {isAnimalSelected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-primary/20 rounded-full">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Color variants */}
          {selectedAnimal && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4"
            >
              <p className="text-[11px] text-muted-foreground text-center mb-3">
                {isAr ? 'اختر اللون' : 'Farbe wählen'}
              </p>
              <div className="flex justify-center gap-3">
                {ANIMAL_AVATARS.find(a => a.id === selectedAnimal)?.colors.map((colorPath, idx) => (
                  <button
                    key={colorPath}
                    onClick={() => {
                      setSelectedAvatar(colorPath);
                      setSelectedAnimal(null);
                    }}
                    className={`relative w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center transition-all duration-200 ${
                      selectedAvatar === colorPath
                        ? 'ring-[3px] ring-primary bg-primary/10 scale-110'
                        : 'ring-2 ring-border/40 bg-muted/30 hover:ring-primary/50'
                    }`}
                  >
                    <img src={colorPath} alt="" className="w-full h-full object-cover object-top" loading="lazy" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
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
