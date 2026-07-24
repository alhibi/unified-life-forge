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
import { useToast } from '@/hooks/use-toast';

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

const CATEGORIES: { value: PlaceCategory; ar: string; de: string }[] = [
  { value: 'nature', ar: 'طبيعة', de: 'Natur' },
  { value: 'historic', ar: 'تاريخي', de: 'Historisch' },
  { value: 'food', ar: 'طعام', de: 'Essen' },
  { value: 'city', ar: 'مدينة', de: 'Stadt' },
  { value: 'religious', ar: 'ديني', de: 'Religiös' },
  { value: 'adventure', ar: 'مغامرة', de: 'Abenteuer' },
  { value: 'other', ar: 'أخرى', de: 'Sonstiges' },
];

export default function AddPlaceSheet({
  open,
  onOpenChange,
  defaultCountryIso,
}: AddPlaceSheetProps) {
  const { language } = useApp();
  const isAr = language === 'ar';
  const { toast } = useToast();
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
        (isAr ? a.nameAr : a.nameEn).localeCompare(isAr ? b.nameAr : b.nameEn, isAr ? 'ar' : 'de'),
      ),
    [isAr],
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
          toast({
            title: isAr ? 'موقعك خارج الدولة المختارة' : 'Dein Standort liegt außerhalb des gewählten Landes',
            description: isAr ? 'اختر الدولة الصحيحة أو حدّد النقطة يدويًا.' : 'Wähle das richtige Land oder setze den Punkt manuell.',
            variant: 'destructive',
          });
          return;
        }
        setLat(la.toFixed(6));
        setLng(lo.toFixed(6));
      },
      () => {
        toast({
          title: isAr ? 'تعذّر جلب الموقع' : 'Standort nicht verfügbar',
          variant: 'destructive',
        });
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
      toast({
        title: isAr ? 'أكمل الحقول المطلوبة' : 'Bitte fülle alle Felder aus',
        variant: 'destructive',
      });
      return;
    }
    if (latN < -90 || latN > 90 || lngN < -180 || lngN > 180) {
      toast({
        title: isAr ? 'إحداثيات غير صحيحة' : 'Ungültige Koordinaten',
        variant: 'destructive',
      });
      return;
    }
    if (!containsPoint(country.bounds, [lngN, latN], 0.75)) {
      toast({
        title: isAr ? 'النقطة خارج الدولة المختارة' : 'Der Punkt liegt außerhalb des gewählten Landes',
        description: isAr ? 'اختر الدولة المناسبة أو حدّد نقطة داخل حدودها.' : 'Wähle das passende Land oder setze einen Punkt innerhalb der Grenzen.',
        variant: 'destructive',
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
      toast({ title: isAr ? 'تمت الإضافة' : 'Ort hinzugefügt' });
      reset();
      onOpenChange(false);
    } catch (err) {
      toast({
        title: isAr ? 'تعذّرت الإضافة' : 'Speichern fehlgeschlagen',
        description: (err as Error)?.message,
        variant: 'destructive',
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
          <SheetTitle>{isAr ? 'إضافة مكان جديد' : 'Neuen Ort hinzufügen'}</SheetTitle>
          <SheetDescription>
            {isAr
              ? 'أضف مكانًا يستحق التذكّر إلى أطلسك.'
              : 'Füge deinem Atlas einen Ort hinzu.'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label>{isAr ? 'الدولة' : 'Land'}</Label>
            <Select value={countryIso} onValueChange={setCountryIso}>
              <SelectTrigger>
                <SelectValue placeholder={isAr ? 'اختر الدولة' : 'Land auswählen'} />
              </SelectTrigger>
              <SelectContent>
                {sortedCountries.map((c) => (
                  <SelectItem key={c.isoCode} value={c.isoCode}>
                    {isAr ? c.nameAr : c.nameEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{isAr ? 'اسم المكان (بالعربية)' : 'Ortsname (Arabisch)'}</Label>
            <Input
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder={isAr ? 'مثال: جبل طويق' : 'z. B. Tuwaiq-Gebirge'}
            />
          </div>

          <div className="space-y-2">
            <Label>{isAr ? 'الاسم بالإنجليزية (اختياري)' : 'Name (Englisch, optional)'}</Label>
            <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>{isAr ? 'التصنيف' : 'Kategorie'}</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as PlaceCategory)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {isAr ? c.ar : c.de}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{isAr ? 'خط العرض' : 'Breitengrad'}</Label>
              <Input
                inputMode="decimal"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="24.7136"
              />
            </div>
            <div className="space-y-2">
              <Label>{isAr ? 'خط الطول' : 'Längengrad'}</Label>
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
            {isAr ? 'استخدم موقعي الحالي' : 'Aktuellen Standort verwenden'}
          </Button>

          {selectedCountry && (
            <div className="space-y-2">
              <Label>{isAr ? 'اختر النقطة على الخريطة' : 'Punkt auf der Karte wählen'}</Label>
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
                {isAr ? 'انقر على الخريطة لتحديد الموقع بدقة.' : 'Tippe auf die Karte, um den Ort zu setzen.'}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>{isAr ? 'صور المكان (حتى 6)' : 'Fotos (bis zu 6)'}</Label>
            <div className="flex flex-wrap gap-2">
              {previews.map((url, i) => (
                <div key={url} className="relative h-20 w-20 overflow-hidden rounded-xl border border-border">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    aria-label={isAr ? 'حذف الصورة' : 'Bild entfernen'}
                    className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-muted-foreground transition-colors hover:border-[hsl(var(--live))] hover:text-foreground">
                  <ImagePlus className="h-5 w-5" aria-hidden="true" />
                  <span className="text-micro">{isAr ? 'إضافة' : 'Foto'}</span>
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
            <Label>{isAr ? 'أفضل وقت للزيارة (اختياري)' : 'Beste Reisezeit (optional)'}</Label>
            <Input
              value={bestTime}
              onChange={(e) => setBestTime(e.target.value)}
              placeholder={isAr ? 'مارس – مايو' : 'März – Mai'}
            />
          </div>

          <div className="space-y-2">
            <Label>{isAr ? 'وسوم (مفصولة بفواصل)' : 'Tags (durch Kommas getrennt)'}</Label>
            <Input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder={isAr ? 'شاطئ، عائلي، غروب' : 'Strand, Familie, Sonnenuntergang'}
            />
          </div>

          <div className="space-y-2">
            <Label>{isAr ? 'وصف مختصر (اختياري)' : 'Beschreibung (optional)'}</Label>
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
            {isAr ? 'إلغاء' : 'Abbrechen'}
          </Button>
          <Button onClick={submit} disabled={createPlace.isPending} className="flex-1 gap-2">
            {createPlace.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {isAr ? 'حفظ المكان' : 'Speichern'}
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
  language: 'ar' | 'de';
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
      aria-label={language === 'ar' ? 'اختيار موقع المكان على الخريطة' : 'Ort auf der Karte wählen'}
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