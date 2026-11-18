import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../dialog';
import ResponsiveDrawer from '../ResponsiveDrawer';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../sheet';

/**
 * Focus return is part of the overlay contract (DESIGN.md §10 C: returning
 * focus to a logical place). Radix restores focus to the element that opened
 * the layer, but DialogContent / DrawerContent used to call
 * event.preventDefault() in onCloseAutoFocus, which dropped focus to <body>.
 * These specs fail if that prevention ever comes back.
 */

function DialogExample() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button">فتح الحوار</button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>عنوان الحوار</DialogTitle>
          <DialogDescription>وصف قصير.</DialogDescription>
        </DialogHeader>
        <button type="button">إجراء داخل الحوار</button>
      </DialogContent>
    </Dialog>
  );
}

function AlertDialogExample() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button type="button">حذف</button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
          <AlertDialogDescription>لا يمكن التراجع.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SheetExample() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button type="button">فتح اللوح</button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>لوح جانبي</SheetTitle>
          <SheetDescription>وصف قصير.</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}

async function closeWithEscape() {
  fireEvent.keyDown(document, { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
}

describe('overlay focus return', () => {
  afterEach(() => {
    // jsdom's viewport is not writable through assignment; restore the default.
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
  });

  it('returns focus to the trigger when a Dialog closes', async () => {
    render(<DialogExample />);
    const trigger = screen.getByRole('button', { name: 'فتح الحوار' });

    act(() => trigger.focus());
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await closeWithEscape();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('returns focus to the trigger when an AlertDialog is cancelled', async () => {
    render(<AlertDialogExample />);
    const trigger = screen.getByRole('button', { name: 'حذف' });

    act(() => trigger.focus());
    fireEvent.click(trigger);
    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('returns focus to the trigger when a Sheet closes', async () => {
    render(<SheetExample />);
    const trigger = screen.getByRole('button', { name: 'فتح اللوح' });

    act(() => trigger.focus());
    fireEvent.click(trigger);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await closeWithEscape();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('returns focus to the trigger when the mobile ResponsiveDrawer drawer closes', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    render(
      <ResponsiveDrawer
        trigger={<button type="button">فتح الدرج</button>}
        title="نموذج قصير"
        description="وصف قصير."
      >
        <button type="button">إجراء داخل الدرج</button>
      </ResponsiveDrawer>,
    );
    const trigger = screen.getByRole('button', { name: 'فتح الدرج' });

    act(() => trigger.focus());
    fireEvent.click(trigger);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await closeWithEscape();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('returns focus to the trigger when the ResponsiveDrawer dialog closes', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
    render(
      <ResponsiveDrawer
        trigger={<button type="button">فتح النموذج</button>}
        title="نموذج قصير"
        description="وصف قصير."
      >
        <button type="button">إجراء داخل النموذج</button>
      </ResponsiveDrawer>,
    );
    const trigger = screen.getByRole('button', { name: 'فتح النموذج' });

    act(() => trigger.focus());
    fireEvent.click(trigger);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    await closeWithEscape();
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
