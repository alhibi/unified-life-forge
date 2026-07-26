import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from '@/lib/icons';

import type { PlaceLinkDraft } from '../api';
import { PRICE_LEVELS, VISIT_STATUS_META } from '../data/categories';
import { CONTINENTS, COUNTRY_CATALOG, findCatalogCountry } from '../data/countriesCatalog';
import { useCreatePlace, useSetCoverPhoto, useUpdatePlace } from '../hooks';
import { containsPoint, isValidCoordinatePair } from '../lib/geo';
import { isValidUrl } from '../lib/validation';
import type { Coordinates, PlaceCategory, TravelPlace, VisitStatus } from '../types';
import CategoryPicker from './form/CategoryPicker';
import LinkEditor from './form/LinkEditor';
import MonthPicker from './form/MonthPicker';
import PhotoPicker from './form/PhotoPicker';
import RatingPicker from './form/RatingPicker';
import SegmentedChoice from './form/SegmentedChoice';
import LocationPicker, { type PickedLocationMeta } from './LocationPicker';

interface PlaceFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present ⇒ edit mode. */
  place?: TravelPlace | null;
  defaultCountryIso?: string | null;
  defaultCoordinates?: Coordinates | null;
  onSaved?: (place: TravelPlace) => void;
}

interface FormState {
  countryIso: string;
  nameAr: string;
  nameEn: string;
  category: PlaceCategory;
  coordinates: Coordinates | null;
  city: string;
  address: string;
  visitStatus: VisitStatus;
  visitedOn: string;
  rating: number | null;
  priceLevel: number | null;
  durationMinutes: string;
  bestMonths: number[];
  bestTimeToVisit: string;
  descriptionAr: string;
  tipsAr: string;
  tagsInput: string;
  links: PlaceLinkDraft[];
}

function emptyForm(countryIso: string, coordinates: Coordinates | null): FormState {
  return {
    countryIso,
    nameAr: '',
    nameEn: '',
    category: 'nature',
    coordinates,
    city: '',
    address: '',
    visitStatus: 'wishlist',
    visitedOn: '',
    rating: null,
    priceLevel: null,
    durationMinutes: '',
    bestMonths: [],
    bestTimeToVisit: '',
    descriptionAr: '',
    tipsAr: '',
    tagsInput: '',
    links: [],
  };
}

function formFromPlace(place: TravelPlace, countryIso: string): FormState {
  return {
    countryIso,
    nameAr: place.nameAr,
    nameEn: place.nameEn ?? '',
    category: place.category,
    coordinates: place.coordinates,
    city: place.city ?? '',
    address: place.address ?? '',
    visitStatus: place.visitStatus,
    visitedOn: place.visitedOn ?? '',
    rating: place.rating,
    priceLevel: place.priceLevel,
    durationMinutes: place.durationMinutes === null ? '' : String(place.durationMinutes),
    bestMonths: place.bestMonths,
    bestTimeToVisit: place.bestTimeToVisit ?? '',
    descriptionAr: place.descriptionAr ?? '',
    tipsAr: place.tipsAr ?? '',
    tagsInput: place.tags.join('، '),
    links: place.links.map((link) => ({ kind: link.kind, label: link.label, url: link.url })),
  };
}

/**
 * Create or edit a place.
 *
 * One scrolling form rather than a wizard: every field is optional except the
 * name and the point, so a place can be saved in fifteen seconds and enriched
 * later — which is how notes actually get taken, standing in the street. The
 * sections exist to make the depth discoverable, not to gate it.
 */
export default function PlaceFormSheet({
  open,
  onOpenChange,
  place,
  defaultCountryIso,
  defaultCoordinates,
  onSaved,
}: PlaceFormSheetProps) {
  const isEdit = Boolean(place);
  const createPlace = useCreatePlace();
  const updatePlace = useUpdatePlace();
  const setCover = useSetCoverPhoto();

  // Seeded once, on mount. Callers render this sheet conditionally
  // (`{open && <PlaceFormSheet …/>}`), so every open is a fresh mount with a
  // fresh draft — which is both simpler and safer than re-seeding from an
  // effect, where a cancelled edit could leak into the next one.
  const [form, setForm] = useState<FormState>(() =>
    place
      ? formFromPlace(place, defaultCountryIso ?? '')
      : emptyForm(defaultCountryIso ?? '', defaultCoordinates ?? null),
  );
  const [files, setFiles] = useState<File[]>([]);
  const [removedPhotoIds, setRemovedPhotoIds] = useState<string[]>([]);
  const [showErrors, setShowErrors] = useState(false);

  const patch = useCallback((next: Partial<FormState>) => {
    setForm((current) => ({ ...current, ...next }));
  }, []);

  const country = useMemo(() => findCatalogCountry(form.countryIso), [form.countryIso]);

  const groupedCountries = useMemo(
    () =>
      CONTINENTS.map((continent) => ({
        continent,
        entries: COUNTRY_CATALOG.filter((entry) => entry.continent === continent.key)
          .slice()
          .sort((a, b) => a.nameAr.localeCompare(b.nameAr, 'ar')),
      })).filter((group) => group.entries.length > 0),
    [],
  );

  const handleLocationChange = useCallback((coordinates: Coordinates) => {
    setForm((current) => ({ ...current, coordinates }));
  }, []);

  // The reverse lookup only fills blanks — it must never overwrite something the
  // user typed, and it must not fight the country they explicitly chose.
  const handleResolved = useCallback((meta: PickedLocationMeta) => {
    setForm((current) => ({
      ...current,
      city: current.city || (meta.city ?? ''),
      address: current.address || (meta.address ?? ''),
      countryIso:
        current.countryIso ||
        (meta.isoCode && findCatalogCountry(meta.isoCode) ? meta.isoCode : ''),
    }));
  }, []);

  const nameError = showErrors && form.nameAr.trim().length === 0;
  const countryError = showErrors && !country;
  const pointError = showErrors && !isValidCoordinatePair(form.coordinates);
  const isSaving = createPlace.isPending || updatePlace.isPending;

  const submit = async () => {
    setShowErrors(true);

    if (!country || form.nameAr.trim().length === 0 || !isValidCoordinatePair(form.coordinates)) {
      toast.error('أكمل الاسم والدولة والموقع');
      return;
    }
    if (form.links.some((link) => link.url.trim().length > 0 && !isValidUrl(link.url))) {
      toast.error('أحد الروابط غير صحيح');
      return;
    }
    if (!containsPoint(country.bounds, form.coordinates, 1.5)) {
      toast.error('الموقع يبدو خارج الدولة المختارة', {
        description: 'اختر الدولة الصحيحة أو حرّك الدبوس داخل حدودها.',
      });
      return;
    }

    const fields = toFields(form);

    try {
      const saved = place
        ? await updatePlace.mutateAsync({
            id: place.id,
            fields,
            countryIso: country.isoCode,
            addedPhotos: files,
            removedPhotoIds,
            links: form.links.filter((link) => isValidUrl(link.url)),
          })
        : await createPlace.mutateAsync({
            ...fields,
            country,
            photos: files,
            links: form.links.filter((link) => isValidUrl(link.url)),
          });

      toast.success(isEdit ? 'تم تحديث المكان' : 'أُضيف المكان إلى أطلسك');
      onSaved?.(saved);
      onOpenChange(false);
    } catch (error) {
      const message = (error as Error)?.message;
      toast.error(isEdit ? 'تعذّر التحديث' : 'تعذّرت الإضافة', {
        description: message === 'not_authenticated' ? 'سجّل الدخول أولًا لحفظ أماكنك.' : message,
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[94dvh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="text-start">
          <SheetTitle>{isEdit ? 'تعديل المكان' : 'إضافة مكان'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'حدّث ما تعرفه عن هذا المكان.'
              : 'الاسم والموقع كافيان للبداية — أضف البقية وقتما تشاء.'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-8 pb-4">
          <section className="space-y-3">
            <h3 className="app-section-label">الموقع</h3>

            <div className="space-y-2">
              <Label htmlFor="place-country">الدولة</Label>
              <Select
                value={form.countryIso}
                onValueChange={(value) => patch({ countryIso: value })}
              >
                <SelectTrigger id="place-country" aria-invalid={countryError}>
                  <SelectValue placeholder="اختر الدولة" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {groupedCountries.map((group) => (
                    <SelectGroup key={group.continent.key}>
                      <SelectLabel>{group.continent.label}</SelectLabel>
                      {group.entries.map((entry) => (
                        <SelectItem key={entry.isoCode} value={entry.isoCode}>
                          {entry.nameAr}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              {countryError && <p className="text-micro text-destructive">اختر الدولة.</p>}
            </div>

            <LocationPicker
              value={form.coordinates}
              onChange={handleLocationChange}
              onResolved={handleResolved}
              initialBounds={country?.bounds ?? null}
              expectedIsoCode={country?.isoCode ?? null}
            />
            {pointError && (
              <p className="text-micro text-destructive">حدّد موقع المكان على الخريطة.</p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="place-city">المدينة</Label>
                <Input
                  id="place-city"
                  value={form.city}
                  onChange={(event) => patch({ city: event.target.value })}
                  placeholder="مثال: الطائف"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="place-address">العنوان</Label>
                <Input
                  id="place-address"
                  value={form.address}
                  onChange={(event) => patch({ address: event.target.value })}
                  placeholder="الحي أو الشارع"
                />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="app-section-label">الهوية</h3>
            <div className="space-y-2">
              <Label htmlFor="place-name">اسم المكان</Label>
              <Input
                id="place-name"
                value={form.nameAr}
                onChange={(event) => patch({ nameAr: event.target.value })}
                placeholder="مثال: وادي الديسة"
                aria-invalid={nameError}
              />
              {nameError && <p className="text-micro text-destructive">الاسم مطلوب.</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="place-name-en">الاسم اللاتيني</Label>
              <Input
                id="place-name-en"
                value={form.nameEn}
                onChange={(event) => patch({ nameEn: event.target.value })}
                dir="ltr"
                placeholder="Wadi Al Disah"
              />
              <p className="text-micro text-muted-foreground">
                يُستخدم عند فتح المكان في تطبيقات الخرائط.
              </p>
            </div>
            <div className="space-y-2">
              <Label>التصنيف</Label>
              <CategoryPicker value={form.category} onChange={(category) => patch({ category })} />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="app-section-label">تجربتك</h3>
            <div className="space-y-2">
              <Label>الحالة</Label>
              <SegmentedChoice
                ariaLabel="حالة الزيارة"
                value={form.visitStatus}
                options={VISIT_STATUS_META.map((status) => ({
                  value: status.value,
                  label: status.label,
                  icon: status.icon,
                }))}
                onChange={(visitStatus) =>
                  patch({
                    visitStatus,
                    visitedOn:
                      visitStatus === 'visited' && !form.visitedOn ? todayIso() : form.visitedOn,
                  })
                }
              />
            </div>

            {form.visitStatus === 'visited' && (
              <div className="space-y-2">
                <Label htmlFor="place-visited-on">تاريخ الزيارة</Label>
                <Input
                  id="place-visited-on"
                  type="date"
                  value={form.visitedOn}
                  max={todayIso()}
                  onChange={(event) => patch({ visitedOn: event.target.value })}
                  className="w-full sm:w-56"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>تقييمك</Label>
              <RatingPicker value={form.rating} onChange={(rating) => patch({ rating })} />
            </div>

            <div className="space-y-2">
              <Label>مستوى التكلفة</Label>
              <SegmentedChoice
                ariaLabel="مستوى التكلفة"
                value={form.priceLevel}
                options={PRICE_LEVELS.map((level) => ({
                  value: level.value,
                  label: level.label,
                }))}
                allowClear
                onClear={() => patch({ priceLevel: null })}
                onChange={(priceLevel) => patch({ priceLevel })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="place-duration">مدة الزيارة (دقائق)</Label>
              <Input
                id="place-duration"
                inputMode="numeric"
                value={form.durationMinutes}
                onChange={(event) =>
                  patch({ durationMinutes: event.target.value.replace(/[^\d]/g, '') })
                }
                placeholder="90"
                className="w-full sm:w-40"
              />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="app-section-label">أفضل وقت</h3>
            <div className="space-y-2">
              <Label>الأشهر المناسبة</Label>
              <MonthPicker
                value={form.bestMonths}
                onChange={(bestMonths) => patch({ bestMonths })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="place-best-time">ملاحظة على التوقيت</Label>
              <Input
                id="place-best-time"
                value={form.bestTimeToVisit}
                onChange={(event) => patch({ bestTimeToVisit: event.target.value })}
                placeholder="بعد العصر، وتجنّب نهاية الأسبوع"
              />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="app-section-label">الصور</h3>
            <PhotoPicker
              existing={place?.photos ?? []}
              removedIds={removedPhotoIds}
              onRemovedIdsChange={setRemovedPhotoIds}
              files={files}
              onFilesChange={setFiles}
              onSetCover={
                place
                  ? (photoId) => {
                      setCover.mutate({ placeId: place.id, photoId });
                    }
                  : undefined
              }
            />
          </section>

          <section className="space-y-3">
            <h3 className="app-section-label">روابط</h3>
            <LinkEditor value={form.links} onChange={(links) => patch({ links })} />
          </section>

          <section className="space-y-3">
            <h3 className="app-section-label">ملاحظاتك</h3>
            <div className="space-y-2">
              <Label htmlFor="place-description">وصف</Label>
              <Textarea
                id="place-description"
                rows={3}
                value={form.descriptionAr}
                onChange={(event) => patch({ descriptionAr: event.target.value })}
                placeholder="ما الذي يجعل هذا المكان يستحق الرحلة؟"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="place-tips">نصائح عملية</Label>
              <Textarea
                id="place-tips"
                rows={3}
                value={form.tipsAr}
                onChange={(event) => patch({ tipsAr: event.target.value })}
                placeholder="مواعيد الدخول، أفضل موقف، ما تحتاج أن تحمله…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="place-tags">وسوم</Label>
              <Input
                id="place-tags"
                value={form.tagsInput}
                onChange={(event) => patch({ tagsInput: event.target.value })}
                placeholder="عائلي، غروب، هادئ"
              />
              <p className="text-micro text-muted-foreground">افصل بينها بفاصلة.</p>
            </div>
          </section>
        </div>

        <SheetFooter className="sticky bottom-0 -mx-6 flex-row gap-2 border-t border-border bg-background px-6 py-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            إلغاء
          </Button>
          <Button type="button" className="flex-1 gap-2" onClick={submit} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {isEdit ? 'حفظ التغييرات' : 'أضف المكان'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function toFields(form: FormState) {
  const duration = Number(form.durationMinutes);
  return {
    nameAr: form.nameAr.trim(),
    nameEn: form.nameEn.trim() || null,
    category: form.category,
    coordinates: form.coordinates as Coordinates,
    city: form.city.trim() || null,
    address: form.address.trim() || null,
    descriptionAr: form.descriptionAr.trim() || null,
    tipsAr: form.tipsAr.trim() || null,
    bestTimeToVisit: form.bestTimeToVisit.trim() || null,
    bestMonths: form.bestMonths,
    visitStatus: form.visitStatus,
    visitedOn: form.visitStatus === 'visited' ? form.visitedOn || null : null,
    priceLevel: form.priceLevel,
    // The column accepts 5 minutes to a week; anything outside that is a typo.
    durationMinutes:
      Number.isFinite(duration) && duration >= 5 && duration <= 10080 ? duration : null,
    tags: form.tagsInput
      .split(/[،,]/)
      .map((tag) => tag.trim())
      .filter(Boolean),
    rating: form.rating,
  };
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
