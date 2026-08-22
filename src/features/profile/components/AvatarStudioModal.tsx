import { AnimatePresence, motion } from 'framer-motion';
import React, { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Palette, RefreshCw, Sparkles, Wand2, X } from '@/lib/icons';

import {
  AvatarCategory,
  AvatarStudioParams,
  DEFAULT_STUDIO_PARAMS,
  generateAvatarDataUri,
  STUDIO_ABSTRACTS,
  STUDIO_ARCHETYPES,
  STUDIO_FRAMES,
  STUDIO_GRADIENTS,
  STUDIO_SEALS,
} from '../lib/avatarStudioEngine';

export interface AvatarStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAvatar: (dataUri: string) => void;
  initialParams?: AvatarStudioParams;
}

const COLOR_SWATCHES_PRIMARY = [
  '#E45B60',
  '#D4AF37',
  '#38BDF8',
  '#10B981',
  '#A855F7',
  '#F97316',
  '#EC4899',
  '#64748B',
];

const COLOR_SWATCHES_SECONDARY = [
  '#38BDF8',
  '#FFE259',
  '#A855F7',
  '#34D399',
  '#F43F5E',
  '#3B82F6',
  '#FB923C',
  '#94A3B8',
];

export const AvatarStudioModal: React.FC<AvatarStudioModalProps> = ({
  isOpen,
  onClose,
  onSelectAvatar,
  initialParams,
}) => {
  const [params, setParams] = useState<AvatarStudioParams>(
    initialParams || DEFAULT_STUDIO_PARAMS
  );

  const [activeTab, setActiveTab] = useState<AvatarCategory>(params.category || 'archetype');

  const liveDataUri = useMemo(() => {
    return generateAvatarDataUri(params);
  }, [params]);

  if (!isOpen) return null;

  const handleApply = () => {
    onSelectAvatar(liveDataUri);
    onClose();
  };

  const handleRandomize = () => {
    const randomGradient = STUDIO_GRADIENTS[Math.floor(Math.random() * STUDIO_GRADIENTS.length)].id;
    const randomFrame = STUDIO_FRAMES[Math.floor(Math.random() * STUDIO_FRAMES.length)].id;
    const randomArchetype = STUDIO_ARCHETYPES[Math.floor(Math.random() * STUDIO_ARCHETYPES.length)].id;
    const randomColor1 = COLOR_SWATCHES_PRIMARY[Math.floor(Math.random() * COLOR_SWATCHES_PRIMARY.length)];
    const randomColor2 = COLOR_SWATCHES_SECONDARY[Math.floor(Math.random() * COLOR_SWATCHES_SECONDARY.length)];

    setParams({
      ...params,
      gradientId: randomGradient,
      frameId: randomFrame,
      presetId: randomArchetype,
      primaryColor: randomColor1,
      secondaryColor: randomColor2,
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto" dir="rtl">
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 12 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className="relative w-full max-w-2xl bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]"
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between p-5 border-b border-border/50 bg-card/60 backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Wand2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lead font-extrabold text-foreground tracking-tight">استوديو الهوية الرقمية</h2>
                <p className="text-micro text-muted-foreground">صمم رمزك الشخصي العصري بالخطوط والألوان المتجهة</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRandomize}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary text-secondary-foreground text-micro font-semibold hover:bg-secondary/80 transition-colors"
                title="توليد عشوائي مبتكر"
              >
                <RefreshCw className="w-3.5 h-3.5 text-primary" />
                <span className="hidden sm:inline">توليد عشوائي</span>
              </button>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-muted/40 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            {/* Live Studio Preview Showcase */}
            <div className="flex flex-col items-center justify-center p-6 surface-depth rounded-2xl relative overflow-hidden">
              <div className="relative w-36 h-36 rounded-2xl p-1 bg-card ring-2 ring-primary/30 shadow-2xl flex items-center justify-center group">
                <img src={liveDataUri} alt="Studio Preview" className="w-full h-full object-contain rounded-xl" />
                <div className="absolute top-2 end-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[0.625rem] font-extrabold text-primary border border-white/10">
                  SVG 256px
                </div>
              </div>

              <p className="mt-3 text-micro font-semibold text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                معاينة حية ومباشرة بدون قيود أو صور مبكسلة
              </p>
            </div>

            {/* Category Tab Selector */}
            <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-2xl overflow-x-auto no-scrollbar">
              <button
                onClick={() => {
                  setActiveTab('archetype');
                  setParams({ ...params, category: 'archetype', presetId: 'arch-scholar' });
                }}
                className={`flex-1 min-w-[100px] py-2 rounded-xl text-micro font-bold transition-all ${
                  activeTab === 'archetype'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                الشخصيات الحديثة
              </button>

              <button
                onClick={() => {
                  setActiveTab('abstract');
                  setParams({ ...params, category: 'abstract', presetId: 'abs-mesh-3d' });
                }}
                className={`flex-1 min-w-[100px] py-2 rounded-xl text-micro font-bold transition-all ${
                  activeTab === 'abstract'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                التجريد والتدرج
              </button>

              <button
                onClick={() => {
                  setActiveTab('monogram');
                  setParams({ ...params, category: 'monogram', presetId: 'seal-squircle-gold' });
                }}
                className={`flex-1 min-w-[100px] py-2 rounded-xl text-micro font-bold transition-all ${
                  activeTab === 'monogram'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                الأختام الحرفية
              </button>

              <button
                onClick={() => {
                  setActiveTab('pattern');
                  setParams({ ...params, category: 'pattern', presetId: 'pattern-lattice' });
                }}
                className={`flex-1 min-w-[100px] py-2 rounded-xl text-micro font-bold transition-all ${
                  activeTab === 'pattern'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                الأنماط الحركية
              </button>
            </div>

            {/* Tab Specific Content */}
            {activeTab === 'archetype' && (
              <div className="space-y-3">
                <label className="text-mini font-bold text-foreground">اختر الشخصية البصرية</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {STUDIO_ARCHETYPES.map((arch) => {
                    const isSelected = params.presetId === arch.id;
                    return (
                      <button
                        key={arch.id}
                        onClick={() => setParams({ ...params, presetId: arch.id })}
                        className={`p-3 rounded-2xl flex flex-col items-center text-center transition-all ${
                          isSelected
                            ? 'bg-primary/10 ring-2 ring-primary scale-[1.02]'
                            : 'bg-card border border-border/50 hover:bg-muted/30'
                        }`}
                      >
                        <span className="text-mini font-bold text-foreground">{arch.labelAr}</span>
                        <span className="text-[0.6875rem] text-muted-foreground mt-0.5 line-clamp-1">{arch.titleAr}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'abstract' && (
              <div className="space-y-3">
                <label className="text-mini font-bold text-foreground">اختر الشكل التجريدي</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {STUDIO_ABSTRACTS.map((abs) => {
                    const isSelected = params.presetId === abs.id;
                    return (
                      <button
                        key={abs.id}
                        onClick={() => setParams({ ...params, presetId: abs.id })}
                        className={`p-3 rounded-2xl flex flex-col items-center text-center transition-all ${
                          isSelected
                            ? 'bg-primary/10 ring-2 ring-primary scale-[1.02]'
                            : 'bg-card border border-border/50 hover:bg-muted/30'
                        }`}
                      >
                        <span className="text-mini font-bold text-foreground">{abs.labelAr}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'monogram' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-mini font-bold text-foreground">الحرف الأولي للختم</label>
                  <Input
                    value={params.monogramChar || 'م'}
                    onChange={(e) => setParams({ ...params, monogramChar: e.target.value.slice(0, 1) })}
                    className="w-24 text-center font-extrabold text-lead font-mono"
                    maxLength={1}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-mini font-bold text-foreground">هيكل وهندسة الختم</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {STUDIO_SEALS.map((seal) => {
                      const isSelected = params.presetId === seal.id;
                      return (
                        <button
                          key={seal.id}
                          onClick={() => setParams({ ...params, presetId: seal.id })}
                          className={`p-3 rounded-2xl flex flex-col items-center text-center transition-all ${
                            isSelected
                              ? 'bg-primary/10 ring-2 ring-primary scale-[1.02]'
                              : 'bg-card border border-border/50 hover:bg-muted/30'
                          }`}
                        >
                          <span className="text-micro font-bold text-foreground">{seal.labelAr}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Background Palette Customizer */}
            <div className="space-y-3 pt-2">
              <label className="text-mini font-bold text-foreground flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-primary" />
                لوحة الألوان والتدرج الخلفي
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {STUDIO_GRADIENTS.map((g) => {
                  const isSelected = params.gradientId === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => setParams({ ...params, gradientId: g.id })}
                      className={`relative h-10 rounded-xl overflow-hidden transition-all ${
                        isSelected ? 'ring-2 ring-primary ring-offset-2 scale-[1.05]' : 'opacity-85 hover:opacity-100'
                      }`}
                      style={{ background: `linear-gradient(135deg, ${g.colors[0]}, ${g.colors[g.colors.length - 1]})` }}
                      title={g.labelAr}
                    >
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Frame Customizer */}
            <div className="space-y-3 pt-2">
              <label className="text-mini font-bold text-foreground">نوع الإطار والإضاءة المحيطة</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {STUDIO_FRAMES.map((f) => {
                  const isSelected = params.frameId === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setParams({ ...params, frameId: f.id })}
                      className={`p-2.5 rounded-xl text-micro font-semibold transition-all ${
                        isSelected
                          ? 'bg-primary/10 ring-2 ring-primary text-primary'
                          : 'bg-card border border-border/50 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {f.labelAr}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Accent Color Customizers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <label className="text-mini font-bold text-foreground">لون العنصر الأساسي</label>
                <div className="flex items-center gap-2">
                  {COLOR_SWATCHES_PRIMARY.map((color) => (
                    <button
                      key={color}
                      onClick={() => setParams({ ...params, primaryColor: color })}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        params.primaryColor === color ? 'scale-125 ring-2 ring-primary ring-offset-1' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-mini font-bold text-foreground">لون التوهج الثانوي</label>
                <div className="flex items-center gap-2">
                  {COLOR_SWATCHES_SECONDARY.map((color) => (
                    <button
                      key={color}
                      onClick={() => setParams({ ...params, secondaryColor: color })}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        params.secondaryColor === color ? 'scale-125 ring-2 ring-primary ring-offset-1' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Action Bar */}
          <div className="p-5 border-t border-border/50 bg-card/60 backdrop-blur-sm flex items-center justify-end gap-3">
            <Button variant="outline" onClick={onClose} className="rounded-xl font-semibold">
              إلغاء
            </Button>
            <Button onClick={handleApply} className="gap-2 px-6 rounded-xl font-bold shadow-lg">
              <Check className="w-4 h-4" />
              تطبيق على البروفايل
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
