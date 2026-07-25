import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { ImagePlus, Loader2, MapPin, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
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
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';

import { COUNTRY_CATALOG } from '../countriesCatalog';
import { useCreatePlace } from '../hooks';
import {
  TILE_SIZE,
  containsPoint,
  fitBounds,
  projectLngLat,
  unprojectPoint,
  visibleTiles,
} from '../mapUtils';
import type { Coordinates, CountryBounds, PlaceCategory } from '../types';

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const MAX_PHOTOS = 6;

interface AddPlaceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCountryIso?: string;
}

const CATEGORIES: { value: PlaceCategory; ar: string; }[] = [
  { value: 'nature', ar: 'طبيعة', },
  { value: 'historic', ar: 'تاريخي', },
  { value: 'food', ar: 'طعام', },
  { value: 'city', ar: 'مدينة', },
  { value: 'religious', ar: 'ديني', },
  { value: 'adventure', ar: 'مغامرة', },
  { value: 'other', ar: 'أخرى', },
];

export default function AddPlaceSheet({
  open,
  onOpenChange,
  defaultCountryIso,
}: AddPlaceSheetProps) {
  const { language } = useApp();
  const createPlace = useCreatePlace();

  const [countryIso, setCountryIso] = useState<string>(defaultCountryIso ?? '');
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [category, setCategory] = useState<PlaceCategory>('nature');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [description, setDescription] = useState('');
  const [bestTime, setBestTime] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  // Manage object URL previews.
  useEffect(() => {
    const urls = photos.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [photos]);

  const selectedCountry = useMemo(
    () => COUNTRY_CATALOG.find((c) => c.isoCode === countryIso),
    [countryIso],
  );

  const sortedCountries = useMemo(
    () =>
      [...COUNTRY_CATALOG].sort((a, b) =>
        (a.nameAr).localeCompare(b.nameAr, 'ar'),
      ),
    [],
  );

  const reset = () => {
    setCountryIso(defaultCountryIso ?? '');
    setNameAr('');
    setNameEn('');
    setCategory('nature');
    setLat('');
    setLng('');
    setDescription('');
    setBestTime('');
    setTagsInput('');
    setPhotos([]);
  };

  const useCurrentLocation = () => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = pos.coords.latitude;
        const lo = pos.coords.longitude;
        if (selectedCountry && !containsPoint(selectedCountry.bounds, [lo, la], 0.75)) {
          toast.error('موقعك خارج الدولة المختارة', {
            description: 'اختر الدولة الصحيحة أو حدّد النقطة يدويًا.',
          });
          return;
        }
        setLat(la.toFixed(6));
        setLng(lo.toFixed(6));
      },
      () => {
        toast.error('تعذّر جلب الموقع');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const onPickPhotos = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    const combined = [...photos, ...files].slice(0, MAX_PHOTOS);
    setPhotos(combined);
    event.target.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = async () => {
    const country = COUNTRY_CATALOG.find((c) => c.isoCode === countryIso);
    const latN = Number(lat);
    const lngN = Number(lng);
    if (!country || !nameAr.trim() || !Number.isFinite(latN) || !Number.isFinite(lngN)) {
      toast.error('أكمل الحقول المطلوبة');
      return;
    }
    if (latN < -90 || latN > 90 || lngN < -180 || lngN > 180) {
      toast.error('إحداثيات غير صحيحة');
      return;
    }
    if (!containsPoint(country.bounds, [lngN, latN], 0.75)) {
      toast.error('النقطة خارج الدولة المختارة', {
        description: 'اختر الدولة المناسبة أو حدّد نقطة داخل حدودها.',
      });
      return;
    }

    try {
      await createPlace.mutateAsync({
        country,
        nameAr: nameAr.trim(),
        nameEn: nameEn.trim() || null,
        category,
        latitude: latN,
        longitude: lngN,
        descriptionAr: description.trim() || null,
        bestTimeToVisit: bestTime.trim() || null,
        tags: tagsInput
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 8),
        photos: photos.length > 0 ? photos : undefined,
      });
      toast.success('تمت الإضافة');
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error('تعذّرت الإضافة', {
        description: (err as Error)?.message,
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] overflow-y-auto rounded-t-3xl"
      >
        <SheetHeader className="text-start">
          <SheetTitle>{'إضافة مكان جديد'}</SheetTitle>
          <SheetDescription>
            {'أضف مكانًا يستحق التذكّر إلى أطلسك.'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label>{'الدولة'}</Label>
            <Select value={countryIso} onValueChange={setCountryIso}>
              <SelectTrigger>
                <SelectValue placeholder={'اختر الدولة'} />
              </SelectTrigger>
              <SelectContent>
                {sortedCountries.map((c) => (
                  <SelectItem key={c.isoCode} value={c.isoCode}>
                    {c.nameAr}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{'اسم المكان (بالعربية)'}</Label>
            <Input
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder={'مثال: جبل طويق'}
            />
          </div>

          <div className="space-y-2">
            <Label>{'الاسم بالإنجليزية (اختياري)'}</Label>
            <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>{'التصنيف'}</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as PlaceCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.ar}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{'خط العرض'}</Label>
              <Input
                inputMode="decimal"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="24.7136"
              />
            </div>
            <div className="space-y-2">
              <Label>{'خط الطول'}</Label>
              <Input
                inputMode="decimal"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="46.6753"
              />
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={useCurrentLocation}
            className="gap-2"
          >
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {'استخدم موقعي الحالي'}
          </Button>

          {selectedCountry && (
            <div className="space-y-2">
              <Label>{'اختر النقطة على الخريطة'}</Label>
              <RasterPointPicker
                bounds={selectedCountry.bounds}
                value={coordinateFromInputs(lat, lng)}
                language={language}
                onChange={([pickedLng, pickedLat]) => {
                  setLat(pickedLat.toFixed(6));
                  setLng(pickedLng.toFixed(6));
                }}
              />
              <p className="text-micro text-muted-foreground">
                {'انقر على الخريطة لتحديد الموقع بدقة.'}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>{'صور المكان (حتى 6)'}</Label>
            <div className="flex flex-wrap gap-2">
              {previews.map((url, i) => (
                <div key={url} className="relative h-20 w-20 overflow-hidden rounded-xl border border-border">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    aria-label={'حذف الصورة'}
                    className="absolute end-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-muted-foreground transition-colors hover:border-[hsl(var(--live))] hover:text-foreground">
                  <ImagePlus className="h-5 w-5" aria-hidden="true" />
                  <span className="text-micro">{'إضافة'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={onPickPhotos}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{'أفضل وقت للزيارة (اختياري)'}</Label>
            <Input
              value={bestTime}
              onChange={(e) => setBestTime(e.target.value)}
              placeholder={'مارس – مايو'}
            />
          </div>

          <div className="space-y-2">
            <Label>{'وسوم (مفصولة بفواصل)'}</Label>
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder={'شاطئ، عائلي، غروب'}
            />
          </div>

          <div className="space-y-2">
            <Label>{'وصف مختصر (اختياري)'}</Label>
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <SheetFooter className="mt-6 flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createPlace.isPending}
            className="flex-1"
          >
            {'إلغاء'}
          </Button>
          <Button onClick={submit} disabled={createPlace.isPending} className="flex-1 gap-2">
            {createPlace.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {'حفظ المكان'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function RasterPointPicker({
  bounds,
  value,
  language,
  onChange,
}: {
  bounds: CountryBounds;
  value: Coordinates | null;
  language: 'ar';
  onChange: (coordinates: Coordinates) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 640, height: 224 });
  const initialView = useMemo(() => fitBounds(bounds, size.width, size.height, 8), [bounds, size.height, size.width]);
  const center = value ?? initialView.center;
  const zoom = value ? Math.max(initialView.zoom, 9) : initialView.zoom;
  const tileData = useMemo(() => visibleTiles(center, zoom, size.width, size.height), [center, size, zoom]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const update = () => {
      const rect = node.getBoundingClientRect();
      setSize({ width: Math.max(280, rect.width), height: Math.max(180, rect.height) });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const pick = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const point = {
        x: tileData.topLeft.x + event.clientX - rect.left,
        y: tileData.topLeft.y + event.clientY - rect.top,
      };
      onChange(unprojectPoint(point, zoom));
    },
    [onChange, tileData.topLeft, zoom],
  );

  const pinPosition = useMemo(() => {
    if (!value) return null;
    const point = projectLngLat(value, zoom);
    return { left: point.x - tileData.topLeft.x, top: point.y - tileData.topLeft.y };
  }, [tileData.topLeft.x, tileData.topLeft.y, value, zoom]);

  return (
    <div
      ref={containerRef}
      dir="ltr"
      className="relative h-56 w-full overflow-hidden rounded-2xl border border-border bg-muted travel-raster-map"
      style={{ touchAction: 'none' }}
      onPointerDown={pick}
      role="button"
      tabIndex={0}
      aria-label={'اختيار موقع المكان على الخريطة'}
    >
      {tileData.tiles.map((tile) => (
        <img
          key={tile.key}
          src={tileUrl(zoom, tile.wrappedX, tile.y)}
          alt=""
          draggable={false}
          decoding="async"
          loading="lazy"
          className="absolute max-w-none travel-raster-map__tile"
          style={{
            width: TILE_SIZE,
            height: TILE_SIZE,
            transform: `translate3d(${Math.round(tile.left)}px, ${Math.round(tile.top)}px, 0)`,
          }}
        />
      ))}
      <div className="absolute inset-0 travel-raster-map__shade" aria-hidden="true" />
      {pinPosition && (
        <span
          className="pointer-events-none absolute grid h-9 w-9 place-items-center rounded-full border-2 border-[hsl(var(--live))] bg-background text-[hsl(var(--live))] shadow-depth"
          style={{ transform: `translate3d(${pinPosition.left}px, ${pinPosition.top}px, 0) translate(-50%, -50%)` } as CSSProperties}
          aria-hidden="true"
        >
          <MapPin className="h-5 w-5 fill-[hsl(var(--live))]/20" />
        </span>
      )}
    </div>
  );
}

function coordinateFromInputs(lat: string, lng: string): Coordinates | null {
  const la = Number(lat);
  const lo = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  if (la < -90 || la > 90 || lo < -180 || lo > 180) return null;
  return [lo, la];
}

function tileUrl(zoom: number, x: number, y: number): string {
  return TILE_URL.replace('{z}', String(zoom)).replace('{x}', String(x)).replace('{y}', String(y));
}