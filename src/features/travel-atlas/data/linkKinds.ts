import {
  Bookmark,
  BookOpen,
  Globe,
  type IconComponent,
  Link2,
  Map as MapIcon,
  Share2,
  Video,
} from '@/lib/icons';

import type { PlaceLinkKind } from '../types';

export interface LinkKindMeta {
  value: PlaceLinkKind;
  label: string;
  icon: IconComponent;
}

/** Kinds are the grouping key on the place page, so the labels are nouns. */
export const LINK_KIND_META: readonly LinkKindMeta[] = [
  { value: 'website', label: 'الموقع الرسمي', icon: Globe },
  { value: 'maps', label: 'خرائط', icon: MapIcon },
  { value: 'booking', label: 'حجز أو تذاكر', icon: Bookmark },
  { value: 'video', label: 'مقطع مرئي', icon: Video },
  { value: 'article', label: 'مقال', icon: BookOpen },
  { value: 'social', label: 'حساب اجتماعي', icon: Share2 },
  { value: 'other', label: 'رابط آخر', icon: Link2 },
] as const;

const INDEX = new Map<PlaceLinkKind, LinkKindMeta>(
  LINK_KIND_META.map((entry) => [entry.value, entry]),
);

export function linkKindMeta(kind: PlaceLinkKind): LinkKindMeta {
  return INDEX.get(kind) ?? LINK_KIND_META[LINK_KIND_META.length - 1];
}
