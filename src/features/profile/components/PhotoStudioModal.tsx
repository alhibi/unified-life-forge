import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Check, ImagePlus, Sliders, Sparkles, X } from '@/lib/icons';

export interface PhotoStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyPhoto: (dataUri: string) => void;
  initialImageFile?: File | null;
}

export type PhotoFrameShape = 'circle' | 'squircle' | 'octagon' | 'hexagon' | 'scallop';
export type PhotoFilterTone = 'original' | 'monochrome' | 'warm-gold' | 'cyber-slate' | 'cinema-contrast' | 'zen-soft';

export interface PhotoFrameOption {
  id: PhotoFrameShape;
  labelAr: string;
}

export interface PhotoFilterOption {
  id: PhotoFilterTone;
  labelAr: string;
}

const PHOTO_FRAMES: PhotoFrameOption[] = [
  { id: 'squircle', labelAr: 'انحناء ناعم (Squircle)' },
  { id: 'circle', labelAr: 'دائري كلاسيكي' },
  { id: 'octagon', labelAr: 'ثماني الأضلاع' },
  { id: 'hexagon', labelAr: 'سداسي بلوري' },
  { id: 'scallop', labelAr: 'ختم طوابع' },
];

const PHOTO_FILTERS: PhotoFilterOption[] = [
  { id: 'original', labelAr: 'الأصلي' },
  { id: 'zen-soft', labelAr: 'زين دافئ' },
  { id: 'monochrome', labelAr: 'أحادي داهام (Noir)' },
  { id: 'warm-gold', labelAr: 'توهج ذهبي' },
  { id: 'cyber-slate', labelAr: 'تيتانيوم سيبراني' },
  { id: 'cinema-contrast', labelAr: 'تباين سينمائي' },
];

export const PhotoStudioModal: React.FC<PhotoStudioModalProps> = ({
  isOpen,
  onClose,
  onApplyPhoto,
  initialImageFile,
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [selectedFrame, setSelectedFrame] = useState<PhotoFrameShape>('squircle');
  const [selectedFilter, setSelectedFilter] = useState<PhotoFilterTone>('zen-soft');
  const [zoom, setZoom] = useState(1);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (initialImageFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImageSrc(e.target.result as string);
        }
      };
      reader.readAsDataURL(initialImageFile);
    }
  }, [initialImageFile]);

  useEffect(() => {
    if (!imageSrc || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const size = 320;
      canvas.width = size;
      canvas.height = size;

      ctx.clearRect(0, 0, size, size);

      ctx.save();
      ctx.beginPath();

      if (selectedFrame === 'circle') {
        ctx.arc(size / 2, size / 2, size / 2 - 8, 0, Math.PI * 2);
      } else if (selectedFrame === 'octagon') {
        const r = size / 2 - 8;
        const cx = size / 2;
        const cy = size / 2;
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4 - Math.PI / 8;
          const x = cx + r * Math.cos(angle);
          const y = cy + r * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
      } else if (selectedFrame === 'hexagon') {
        const r = size / 2 - 8;
        const cx = size / 2;
        const cy = size / 2;
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const x = cx + r * Math.cos(angle);
          const y = cy + r * Math.sin(angle);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
      } else {
        const cornerRadius = 64;
        const pad = 12;
        ctx.roundRect(pad, pad, size - pad * 2, size - pad * 2, cornerRadius);
      }

      ctx.clip();

      if (selectedFilter === 'monochrome') {
        ctx.filter = 'grayscale(100%) contrast(125%) brightness(95%)';
      } else if (selectedFilter === 'warm-gold') {
        ctx.filter = 'sepia(35%) contrast(110%) brightness(105%) hue-rotate(-10deg)';
      } else if (selectedFilter === 'cyber-slate') {
        ctx.filter = 'contrast(120%) saturate(85%) hue-rotate(180deg)';
      } else if (selectedFilter === 'cinema-contrast') {
        ctx.filter = 'contrast(140%) brightness(90%) saturate(110%)';
      } else if (selectedFilter === 'zen-soft') {
        ctx.filter = 'contrast(105%) brightness(102%) saturate(95%)';
      } else {
        ctx.filter = 'none';
      }

      const aspect = img.width / img.height;
      let drawW = size * zoom;
      let drawH = (size / aspect) * zoom;
      if (aspect < 1) {
        drawH = size * zoom;
        drawW = size * aspect * zoom;
      }

      const drawX = (size - drawW) / 2;
      const drawY = (size - drawH) / 2;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();
    };
    img.src = imageSrc;
  }, [imageSrc, selectedFrame, selectedFilter, zoom]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setImageSrc(ev.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApply = () => {
    if (canvasRef.current) {
      const dataUri = canvasRef.current.toDataURL('image/png', 0.92);
      onApplyPhoto(dataUri);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto" dir="rtl">
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 12 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className="relative w-full max-w-lg bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lead font-extrabold text-foreground">استوديو معالجة الصورة الشخصية</h2>
                <p className="text-micro text-muted-foreground">تأطير الصورة الشخصية وتطبيق الفلاتر الحديثة</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-muted/40 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content Body */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="flex flex-col items-center justify-center surface-depth rounded-2xl p-6 relative">
              {imageSrc ? (
                <div className="relative w-48 h-48 rounded-2xl bg-card ring-2 ring-primary/30 shadow-2xl overflow-hidden flex items-center justify-center">
                  <canvas ref={canvasRef} className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <ImagePlus className="w-7 h-7" />
                  </div>
                  <p className="text-mini font-semibold text-muted-foreground">اختر صورة من جهازك لتخصيصها</p>
                  <Button onClick={() => fileInputRef.current?.click()} size="sm" className="gap-2">
                    رفع صورة جديدة
                  </Button>
                </div>
              )}

              {imageSrc && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 gap-1.5 text-micro text-muted-foreground hover:text-foreground"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  تغيير الصورة
                </Button>
              )}
            </div>

            {imageSrc && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-micro font-semibold text-muted-foreground">
                    <span>درجة التقريب (Zoom)</span>
                    <span>{Math.round(zoom * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="2"
                    step="0.05"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-mini font-bold text-foreground">شكل الإطار والقص</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PHOTO_FRAMES.map((frame) => (
                      <button
                        key={frame.id}
                        onClick={() => setSelectedFrame(frame.id)}
                        className={`p-2.5 rounded-xl text-micro font-semibold transition-all ${
                          selectedFrame === frame.id
                            ? 'bg-primary/10 ring-2 ring-primary text-primary'
                            : 'bg-card border border-border/50 text-muted-foreground'
                        }`}
                      >
                        {frame.labelAr}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-mini font-bold text-foreground">فلتر النغمة البصرية</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PHOTO_FILTERS.map((filter) => (
                      <button
                        key={filter.id}
                        onClick={() => setSelectedFilter(filter.id)}
                        className={`p-2.5 rounded-xl text-micro font-semibold transition-all ${
                          selectedFilter === filter.id
                            ? 'bg-primary/10 ring-2 ring-primary text-primary'
                            : 'bg-card border border-border/50 text-muted-foreground'
                        }`}
                      >
                        {filter.labelAr}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-border/50 flex items-center justify-end gap-3">
            <Button variant="outline" onClick={onClose} className="rounded-xl font-semibold">
              إلغاء
            </Button>
            <Button onClick={handleApply} disabled={!imageSrc} className="gap-2 px-6 rounded-xl font-bold shadow-lg">
              <Check className="w-4 h-4" />
              تأكيد الصورة
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
