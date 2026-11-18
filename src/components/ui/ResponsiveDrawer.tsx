import React from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';

interface ResponsiveDrawerProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export default function ResponsiveDrawer({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
}: ResponsiveDrawerProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
        <DrawerContent className="px-4 pb-8 max-h-[85dvh]">
          <DrawerHeader className="text-start px-0">
            <DrawerTitle className="text-lead font-bold text-foreground">{title}</DrawerTitle>
            {description && (
              <DrawerDescription className="text-meta text-muted-foreground">
                {description}
              </DrawerDescription>
            )}
          </DrawerHeader>
          <div className="overflow-y-auto max-h-[60dvh] py-2">{children}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      {/* The desktop layer carries the same content as the mobile sheet, so it
          must cap its height and scroll like the sheet does; without this a long
          model/detail sheet ran 1203px tall in a 900px viewport and clipped
          above and below the screen. Width stays the compact form width. */}
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lead font-bold text-foreground">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-meta text-muted-foreground">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="py-2">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
