import React from 'react';
import { AppCard, Section } from '@/components/ui/app-shell';
import { Skeleton } from '@/components/ui/skeleton';
export function FitnessDashboardSkeleton() {
  return (
    <Section className="w-full">
      <div className="grid grid-cols-2 gap-4">
        <AppCard className="p-4 flex flex-col gap-2">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-16" />
        </AppCard>
        <AppCard className="p-4 flex flex-col gap-2">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-16" />
        </AppCard>
      </div>
      <AppCard className="h-64 mt-6 p-4 flex flex-col justify-between">
         <Skeleton className="h-6 w-1/3 mb-4" />
         <div className="flex-1 w-full flex items-end gap-2 px-2">
            {[...Array(7)].map((_, i) => ( <Skeleton key={i} className="flex-1 rounded-t-md" style={{ height: `${Math.random() * 60 + 20}%` }} /> ))}
         </div>
      </AppCard>
      <div className="mt-8 space-y-4">
        <Skeleton className="h-6 w-32" />
        {[...Array(3)].map((_, i) => (
          <AppCard key={i} compact className="flex items-center gap-4">
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
               <Skeleton className="h-4 w-1/2" />
               <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="w-16 h-4" />
          </AppCard>
        ))}
      </div>
    </Section>
  );
}
