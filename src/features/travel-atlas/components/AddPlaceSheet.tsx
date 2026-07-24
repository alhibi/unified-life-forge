import { useMemo, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';

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
import type { PlaceCategory } from '../types';

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
  };

  const useCurrentLocation = () => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
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

    try {
      await createPlace.mutateAsync({
        country,
        nameAr: nameAr.trim(),
        nameEn: nameEn.trim() || null,
        category,
        latitude: latN,
        longitude: lngN,
        descriptionAr: description.trim() || null,
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