import React, { useMemo, useState } from 'react';

import { IconChip } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Check, Palette, RefreshCw, Sparkles, Wand2 } from '@/lib/icons';

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

/**
 * Colour swatches are the *palette of the generated avatar* — they are the
 * data the studio bakes into the SVG, not UI chrome, so raw hex is allowed
 * here (and only here).
 */
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

const OPTION_IDLE = 'border border-border bg-transparent text-muted-foreground hover:text-foreground';
const OPTION_ACTIVE = 'border border-primary/50 bg-primary/10 text-primary';

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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0">
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-border p-5 pe-16">
          <IconChip aria-hidden>
            <Wand2 className="h-5 w-5" />
          </IconChip>
          <div className="min-w-0">
            <DialogTitle className="text-lead font-bold text-foreground">
              استوديو الهوية الرقمية
            </DialogTitle>
            <DialogDescription className="text-micro text-muted-foreground">
              صمم رمزك الشخصي العصري بالخطوط والألوان المتجهة
            </DialogDescription>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {/* Live Studio Preview Showcase */}
          <div className="flex flex-col items-center justify-center rounded-lg bg-muted/30 p-6">
            <div className="relative flex h-36 w-36 items-center justify-center rounded-2xl bg-secondary p-1 ring-1 ring-border">
              <img src={liveDataUri} alt="Studio Preview" className="h-full w-full rounded-xl object-contain" />
              <div className="absolute end-2 top-2 rounded-md bg-secondary px-2 py-0.5 text-micro font-extrabold text-primary border border-border">
                SVG 256px
              </div>
            </div>

            <p className="mt-3 flex items-center gap-1.5 text-micro font-semibold text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />
              معاينة حية ومباشرة بدون قيود أو صور مبكسلة
            </p>
          </div>

          {/* Category Tab Selector */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar rounded-2xl bg-muted/40 p-1">
            <button
              onClick={() => {
                setActiveTab('archetype');
                setParams({ ...params, category: 'archetype', presetId: 'arch-scholar' });
              }}
              aria-pressed={activeTab === 'archetype'}
              className={`min-w-[100px] flex-1 rounded-xl py-2 text-micro font-bold transition-motion ${
                activeTab === 'archetype'
                  ? 'bg-primary text-primary-foreground'
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
              aria-pressed={activeTab === 'abstract'}
              className={`min-w-[100px] flex-1 rounded-xl py-2 text-micro font-bold transition-motion ${
                activeTab === 'abstract'
                  ? 'bg-primary text-primary-foreground'
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
              aria-pressed={activeTab === 'monogram'}
              className={`min-w-[100px] flex-1 rounded-xl py-2 text-micro font-bold transition-motion ${
                activeTab === 'monogram'
                  ? 'bg-primary text-primary-foreground'
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
              aria-pressed={activeTab === 'pattern'}
              className={`min-w-[100px] flex-1 rounded-xl py-2 text-micro font-bold transition-motion ${
                activeTab === 'pattern'
                  ? 'bg-primary text-primary-foreground'
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
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {STUDIO_ARCHETYPES.map((arch) => {
                  const isSelected = params.presetId === arch.id;
                  return (
                    <button
                      key={arch.id}
                      onClick={() => setParams({ ...params, presetId: arch.id })}
                      aria-pressed={isSelected}
                      className={`flex flex-col items-center rounded-2xl p-3 text-center transition-motion ${
                        isSelected ? OPTION_ACTIVE : OPTION_IDLE
                      }`}
                    >
                      <span className="text-mini font-bold text-foreground">{arch.labelAr}</span>
                      <span className="mt-0.5 line-clamp-1 text-micro text-muted-foreground">{arch.titleAr}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'abstract' && (
            <div className="space-y-3">
              <label className="text-mini font-bold text-foreground">اختر الشكل التجريدي</label>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {STUDIO_ABSTRACTS.map((abs) => {
                  const isSelected = params.presetId === abs.id;
                  return (
                    <button
                      key={abs.id}
                      onClick={() => setParams({ ...params, presetId: abs.id })}
                      aria-pressed={isSelected}
                      className={`flex flex-col items-center rounded-2xl p-3 text-center transition-motion ${
                        isSelected ? OPTION_ACTIVE : OPTION_IDLE
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
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  {STUDIO_SEALS.map((seal) => {
                    const isSelected = params.presetId === seal.id;
                    return (
                      <button
                        key={seal.id}
                        onClick={() => setParams({ ...params, presetId: seal.id })}
                        aria-pressed={isSelected}
                        className={`flex flex-col items-center rounded-2xl p-3 text-center transition-motion ${
                          isSelected ? OPTION_ACTIVE : OPTION_IDLE
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
            <label className="flex items-center gap-1.5 text-mini font-bold text-foreground">
              <Palette className="h-4 w-4 text-primary" aria-hidden />
              لوحة الألوان والتدرج الخلفي
            </label>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {STUDIO_GRADIENTS.map((g) => {
                const isSelected = params.gradientId === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => setParams({ ...params, gradientId: g.id })}
                    aria-pressed={isSelected}
                    className={`relative h-10 overflow-hidden rounded-xl transition-motion ${
                      isSelected ? 'ring-2 ring-primary ring-offset-2' : 'opacity-85 hover:opacity-100'
                    }`}
                    // Swatch preview of the generated avatar's own gradient (data, not chrome).
                    style={{ background: `linear-gradient(135deg, ${g.colors[0]}, ${g.colors[g.colors.length - 1]})` }}
                    title={g.labelAr}
                  >
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/30">
                        <Check className="h-4 w-4 text-foreground" aria-hidden />
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
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {STUDIO_FRAMES.map((f) => {
                const isSelected = params.frameId === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setParams({ ...params, frameId: f.id })}
                    aria-pressed={isSelected}
                    className={`rounded-xl p-2.5 text-micro font-semibold transition-motion ${
                      isSelected ? OPTION_ACTIVE : OPTION_IDLE
                    }`}
                  >
                    {f.labelAr}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accent Color Customizers */}
          <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-mini font-bold text-foreground">لون العنصر الأساسي</label>
              <div className="flex items-center gap-2">
                {COLOR_SWATCHES_PRIMARY.map((color) => (
                  <button
                    key={color}
                    onClick={() => setParams({ ...params, primaryColor: color })}
                    className={`h-7 w-7 rounded-full transition-transform ${
                      params.primaryColor === color ? 'ring-2 ring-primary ring-offset-1' : ''
                    }`}
                    // Swatch value = a colour baked into the generated avatar (data).
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
                    className={`h-7 w-7 rounded-full transition-transform ${
                      params.secondaryColor === color ? 'ring-2 ring-primary ring-offset-1' : ''
                    }`}
                    // Swatch value = a colour baked into the generated avatar (data).
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Action Bar */}
        <div className="flex items-center gap-3 border-t border-border p-5">
          <Button variant="secondary" onClick={handleRandomize} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5 text-primary" aria-hidden />
            <span className="hidden sm:inline">توليد عشوائي</span>
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={handleApply} className="gap-2">
            <Check className="h-4 w-4" aria-hidden />
            تطبيق على البروفايل
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
