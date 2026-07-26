import { useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

import type { TripFields } from '../api';
import { useUpdateTrip } from '../hooks';
import type { Trip, TripStatus } from '../types';
import SegmentedChoice from './form/SegmentedChoice';

interface TripEditSheetProps {
  trip: Trip;
  onOpenChange: (open: boolean) => void;
}

const STATUS_OPTIONS: { value: TripStatus; label: string }[] = [
  { value: 'draft', label: 'مسوّدة' },
  { value: 'planned', label: 'مخطَّطة' },
  { value: 'active', label: 'جارية' },
  { value: 'done', label: 'انتهت' },
];

/**
 * Edit a trip after creating it.
 *
 * Every field here was write-once: a trip could be created with a title and
 * dates and then never corrected, and the budget and notes columns existed with
 * no way at all to fill them. A plan is the thing that changes most between
 * being made and being travelled.
 */
export default function TripEditSheet({ trip, onOpenChange }: TripEditSheetProps) {
  const updateTrip = useUpdateTrip();

  const [title, setTitle] = useState(trip.title);
  const [startDate, setStartDate] = useState(trip.startDate ?? '');
  const [endDate, setEndDate] = useState(trip.endDate ?? '');
  const [status, setStatus] = useState<TripStatus>(trip.status);
  const [notes, setNotes] = useState(trip.notesAr ?? '');
  const [budget, setBudget] = useState(trip.budgetAmount === null ? '' : String(trip.budgetAmount));
  const [currency, setCurrency] = useState(trip.budgetCurrency ?? '');

  const submit = async () => {
    const trimmed = title.trim();
    if (trimmed.length === 0) {
      toast.error('عنوان الرحلة مطلوب');
      return;
    }
    if (startDate && endDate && endDate < startDate) {
      toast.error('تاريخ النهاية قبل البداية');
      return;
    }

    const amount = Number(budget);
    const fields: Partial<TripFields> = {
      title: trimmed,
      startDate: startDate || null,
      endDate: endDate || null,
      status,
      notesAr: notes.trim() || null,
      budgetAmount:
        budget.trim().length > 0 && Number.isFinite(amount) && amount >= 0 ? amount : null,
      budgetCurrency: currency.trim().toUpperCase() || null,
    };

    try {
      await updateTrip.mutateAsync({ tripId: trip.id, fields });
      toast.success('حُدّثت الرحلة');
      onOpenChange(false);
    } catch (error) {
      toast.error('تعذّر التحديث', { description: (error as Error)?.message });
    }
  };

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="text-start">
          <SheetTitle>تعديل الرحلة</SheetTitle>
          <SheetDescription>العنوان والتواريخ والملاحظات والميزانية.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="trip-edit-title">العنوان</Label>
            <Input
              id="trip-edit-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="مثال: أسبوع في جورجيا"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="trip-edit-start">البداية</Label>
              <Input
                id="trip-edit-start"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trip-edit-end">النهاية</Label>
              <Input
                id="trip-edit-end"
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>الحالة</Label>
            <SegmentedChoice
              ariaLabel="حالة الرحلة"
              value={status}
              options={STATUS_OPTIONS}
              onChange={setStatus}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="trip-edit-budget">الميزانية</Label>
              <Input
                id="trip-edit-budget"
                inputMode="decimal"
                value={budget}
                onChange={(event) => setBudget(event.target.value.replace(/[^\d.]/g, ''))}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trip-edit-currency">العملة</Label>
              <Input
                id="trip-edit-currency"
                value={currency}
                onChange={(event) => setCurrency(event.target.value.slice(0, 3))}
                placeholder="SAR"
                dir="ltr"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trip-edit-notes">ملاحظات</Label>
            <Textarea
              id="trip-edit-notes"
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="أرقام الحجوزات، تنبيهات، أي شيء تحتاجه في الطريق."
            />
          </div>
        </div>

        <SheetFooter className="mt-6 flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={updateTrip.isPending}
          >
            إلغاء
          </Button>
          <Button
            type="button"
            className="flex-1 gap-2"
            onClick={submit}
            disabled={updateTrip.isPending}
          >
            {updateTrip.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            حفظ
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
