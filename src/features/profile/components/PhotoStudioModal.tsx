import React, { useEffect, useRef, useState } from 'react';

import { IconChip } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Check, ImagePlus, Sliders } from '@/lib/icons';

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

const OPTION_IDLE = 'border border-border bg-transparent text-muted-foreground hover:text-foreground';
const OPTION_ACTIVE = 'border border-primary/50 bg-primary/10 text-primary';

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

  // Canvas masking / filtering pixels are the actual image product this studio
  // exports — the drawing logic (frames, filters, zoom) is intentionally kept
  // exactly as it was. Only the chrome around it moved to the design system.
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-lg flex-col gap-0 overflow-hidden p-0">
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-border p-5 pe-16">
          <IconChip aria-hidden>
            <Sliders className="h-5 w-5" />
          </IconChip>
          <div className="min-w-0">
            <DialogTitle className="text-lead font-bold text-foreground">
              استوديو معالجة الصورة الشخصية
            </DialogTitle>
            <DialogDescription className="text-micro text-muted-foreground">
              تأطير الصورة الشخصية وتطبيق الفلاتر الحديثة
            </DialogDescription>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="flex flex-col items-center justify-center rounded-lg bg-muted/30 p-6">
            {imageSrc ? (
              <div className="relative flex h-48 w-48 items-center justify-center overflow-hidden rounded-2xl bg-secondary ring-1 ring-border">
                <canvas ref={canvasRef} className="h-full w-full object-contain" />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-3 py-10 text-center">
                <IconChip aria-hidden>
                  <ImagePlus className="h-6 w-6" />
                </IconChip>
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
                <ImagePlus className="h-3.5 w-3.5" aria-hidden />
                تغيير الصورة
              </Button>
            )}
          </div>

          {imageSrc && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-micro font-semibold text-muted-foreground">
                  <span>درجة التقريب (Zoom)</span>
                  <span className="tabular-nums">{Math.round(zoom * 100)}%</span>
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
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {PHOTO_FRAMES.map((frame) => (
                    <button
                      key={frame.id}
                      onClick={() => setSelectedFrame(frame.id)}
                      aria-pressed={selectedFrame === frame.id}
                      className={`rounded-xl p-2.5 text-micro font-semibold transition-motion ${
                        selectedFrame === frame.id ? OPTION_ACTIVE : OPTION_IDLE
                      }`}
                    >
                      {frame.labelAr}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-mini font-bold text-foreground">فلتر النغمة البصرية</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {PHOTO_FILTERS.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setSelectedFilter(filter.id)}
                      aria-pressed={selectedFilter === filter.id}
                      className={`rounded-xl p-2.5 text-micro font-semibold transition-motion ${
                        selectedFilter === filter.id ? OPTION_ACTIVE : OPTION_IDLE
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
        <div className="flex items-center justify-end gap-3 border-t border-border p-5">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={handleApply} disabled={!imageSrc} className="gap-2">
            <Check className="h-4 w-4" aria-hidden />
            تأكيد الصورة
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
