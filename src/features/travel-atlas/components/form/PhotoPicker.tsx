import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';

import { Image as ImageIcon, Plus, Star, X } from '@/lib/icons';
import { cn } from '@/lib/utils';

import { MAX_PHOTOS_PER_PLACE, screenPhotoFiles } from '../../lib/photoPipeline';
import type { PlacePhoto } from '../../types';

interface PhotoPickerProps {
  /** Photos already stored for this place (edit mode). */
  existing: PlacePhoto[];
  /** Ids of stored photos staged for deletion. */
  removedIds: string[];
  onRemovedIdsChange: (ids: string[]) => void;
  /** Newly attached files, not yet uploaded. */
  files: File[];
  onFilesChange: (files: File[]) => void;
  /** Promote a stored photo to cover (edit mode only). */
  onSetCover?: (photoId: string) => void;
  /** Save a caption for a stored photo (edit mode only). */
  onCaptionCommit?: (photoId: string, caption: string | null) => void;
}

/**
 * The photo strip.
 *
 * A place with no photograph is a coordinate; a place with one is a memory, so
 * this is deliberately the most prominent field in the form. Removals are staged
 * rather than applied immediately — the user can still cancel the whole edit.
 */
export default function PhotoPicker({
  existing,
  removedIds,
  onRemovedIdsChange,
  files,
  onFilesChange,
  onSetCover,
  onCaptionCommit,
}: PhotoPickerProps) {
  // Object URLs are derived, not state: deriving them keeps the previews in the
  // same render as the files they belong to, and the effect exists only to hand
  // the URLs back to the browser afterwards.
  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(
    () => () => {
      for (const url of previews) URL.revokeObjectURL(url);
    },
    [previews],
  );

  const kept = existing.filter((photo) => !removedIds.includes(photo.id));
  const total = kept.length + files.length;
  const remaining = MAX_PHOTOS_PER_PLACE - total;

  const addFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (picked.length === 0) return;

    const { accepted, rejected } = screenPhotoFiles(picked);
    if (rejected.length > 0) {
      toast.error('بعض الصور لم تُقبل', { description: rejected.slice(0, 3).join(' · ') });
    }
    if (accepted.length === 0) return;

    const room = Math.max(0, remaining);
    if (room === 0) {
      toast.error(`الحد الأقصى ${MAX_PHOTOS_PER_PLACE} صورة`);
      return;
    }
    onFilesChange([...files, ...accepted.slice(0, room)]);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {kept.map((photo) => (
          <figure key={photo.id} className="w-24 space-y-1">
            <span className="relative block h-24 w-24 overflow-hidden rounded-card border border-border">
              <img
                src={photo.url}
                alt={photo.captionAr ?? ''}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => onRemovedIdsChange([...removedIds, photo.id])}
                aria-label="حذف الصورة"
                className="absolute end-1 top-1 grid h-7 w-7 place-items-center rounded-full border border-border bg-background text-foreground"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
              {onSetCover && (
                <button
                  type="button"
                  onClick={() => onSetCover(photo.id)}
                  aria-label={photo.isCover ? 'هذه صورة الغلاف' : 'اجعلها صورة الغلاف'}
                  aria-pressed={photo.isCover}
                  className={cn(
                    'absolute bottom-1 start-1 grid h-7 w-7 place-items-center rounded-full border border-border bg-background',
                    photo.isCover ? 'text-[hsl(var(--live))]' : 'text-muted-foreground',
                  )}
                >
                  <Star className="h-3.5 w-3.5" fill={photo.isCover ? 'currentColor' : undefined} />
                </button>
              )}
            </span>

            {onCaptionCommit && (
              // Committed on blur, not per keystroke: a caption is one thought,
              // and a request per letter would be absurd.
              <input
                type="text"
                defaultValue={photo.captionAr ?? ''}
                onBlur={(event) => {
                  const next = event.target.value.trim();
                  if (next === (photo.captionAr ?? '')) return;
                  onCaptionCommit(photo.id, next || null);
                }}
                placeholder="تعليق"
                aria-label="تعليق الصورة"
                className="app-control h-8 w-24 px-2 text-micro"
              />
            )}
          </figure>
        ))}

        {previews.map((url, index) => (
          <figure
            key={url}
            className="relative h-24 w-24 overflow-hidden rounded-card border border-border"
          >
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onFilesChange(files.filter((_, i) => i !== index))}
              aria-label="إزالة الصورة"
              className="absolute end-1 top-1 grid h-7 w-7 place-items-center rounded-full border border-border bg-background text-foreground"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <figcaption className="absolute inset-x-0 bottom-0 bg-background/95 py-0.5 text-center text-micro text-muted-foreground">
              جديدة
            </figcaption>
          </figure>
        ))}

        {remaining > 0 && (
          <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-card border border-dashed border-border text-muted-foreground transition-colors hover:border-[hsl(var(--live))] hover:text-foreground">
            <Plus className="h-5 w-5" aria-hidden="true" />
            <span className="text-micro">أضف صورة</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={addFiles}
              aria-label="اختيار صور"
            />
          </label>
        )}
      </div>

      <p className="flex items-center gap-1.5 text-micro text-muted-foreground">
        <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
        {total === 0
          ? `حتى ${MAX_PHOTOS_PER_PLACE} صور — تُضغط تلقائيًا قبل الرفع`
          : `${total} من ${MAX_PHOTOS_PER_PLACE} · الأولى هي الغلاف`}
      </p>
    </div>
  );
}
