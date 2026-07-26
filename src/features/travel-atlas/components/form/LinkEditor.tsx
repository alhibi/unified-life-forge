import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from '@/lib/icons';

import type { PlaceLinkDraft } from '../../api';
import { LINK_KIND_META } from '../../data/linkKinds';
import { isValidUrl } from '../../lib/validation';
import type { PlaceLinkKind } from '../../types';

interface LinkEditorProps {
  value: PlaceLinkDraft[];
  onChange: (links: PlaceLinkDraft[]) => void;
}

const MAX_LINKS = 8;

/**
 * References attached to a place — the booking page, the video that made you
 * want to go, the article with the opening hours. Kept as typed rows rather than
 * one URL field, because the kind is what lets the place page group them.
 */
export default function LinkEditor({ value, onChange }: LinkEditorProps) {
  const update = (index: number, patch: Partial<PlaceLinkDraft>) => {
    onChange(value.map((link, i) => (i === index ? { ...link, ...patch } : link)));
  };

  return (
    <div className="space-y-2">
      {value.map((link, index) => (
        <div key={index} className="space-y-2 rounded-card border border-border p-3">
          <div className="flex items-center gap-2">
            <Select
              value={link.kind}
              onValueChange={(kind) => update(index, { kind: kind as PlaceLinkKind })}
            >
              <SelectTrigger className="w-36 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LINK_KIND_META.map((kind) => (
                  <SelectItem key={kind.value} value={kind.value}>
                    {kind.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={link.label ?? ''}
              onChange={(event) => update(index, { label: event.target.value })}
              placeholder="وصف مختصر (اختياري)"
              className="min-w-0 flex-1"
              aria-label="وصف الرابط"
            />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
              aria-label="حذف الرابط"
              className="app-icon-btn shrink-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <Input
            value={link.url}
            onChange={(event) => update(index, { url: event.target.value })}
            placeholder="https://"
            inputMode="url"
            dir="ltr"
            aria-label="عنوان الرابط"
            aria-invalid={link.url.length > 0 && !isValidUrl(link.url)}
          />
          {link.url.length > 0 && !isValidUrl(link.url) && (
            <p className="text-micro text-destructive">الرابط يجب أن يبدأ بـ http أو https</p>
          )}
        </div>
      ))}

      {value.length < MAX_LINKS && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => onChange([...value, { kind: 'website', url: '', label: '' }])}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          أضف رابطًا
        </Button>
      )}
    </div>
  );
}
