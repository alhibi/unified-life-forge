import React, { useState } from 'react';

import { AppCard,PageShell, Section } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import ResponsiveDrawer from '@/components/ui/ResponsiveDrawer';
import { MapPin, Play, Square } from '@/lib/icons';

import { useFitnessEngine } from '../../model/useFitnessEngine';
import { FitnessActivityChart } from '../components/FitnessActivityChart';
export function FitnessDashboardPage() {
  const { isTracking, currentActivity, activities, totalDistance, startTracking, stopTracking, currentCalories } = useFitnessEngine();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayActivities = activities.filter(a => a.start_time.startsWith(todayStr));
  const todayDistance = todayActivities.reduce((sum, a) => sum + (a.distance_meters || 0), 0);
  const todayCalories = todayActivities.reduce((sum, a) => sum + (a.calories_burned || 0), 0);
  const totalDurationMin = todayActivities.reduce((sum, a) => sum + Math.floor((a.duration_seconds || 0) / 60), 0);
  return (
    <PageShell className="pb-page">
      <div className="flex items-center justify-between py-4">
        <h1 className="text-2xl font-bold font-cormorant-garamond tracking-wide">اللياقة</h1>
      </div>
      <Section tight>
         <div className="grid grid-cols-3 gap-3 mb-6">
            <AppCard className="p-3 text-center flex flex-col gap-1">
               <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">المسافة (كم)</span>
               <span className="text-2xl font-montserrat tabular-nums text-primary font-medium">{(todayDistance / 1000).toFixed(2)}</span>
            </AppCard>
            <AppCard className="p-3 text-center flex flex-col gap-1">
               <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">السعرات</span>
               <span className="text-2xl font-montserrat tabular-nums font-medium">{Math.floor(todayCalories)}</span>
            </AppCard>
            <AppCard className="p-3 text-center flex flex-col gap-1">
               <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">الدقائق</span>
               <span className="text-2xl font-montserrat tabular-nums font-medium">{totalDurationMin}</span>
            </AppCard>
         </div>
         <AppCard className="relative overflow-hidden border-primary/20 bg-primary/5">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="p-6 flex flex-col items-center justify-center text-center z-base relative">
               {isTracking ? (
                 <>
                   <div className="mb-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-medium animate-pulse">
                         <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                         نشط الآن
                      </span>
                   </div>
                   <div className="text-5xl font-montserrat font-light tabular-nums tracking-tighter mb-2">
                     {((currentActivity?.distance_meters || 0) / 1000).toFixed(2)} <span className="text-lg text-muted-foreground">كم</span>
                   </div>
                   <div className="text-muted-foreground flex gap-4 text-sm mb-8 font-montserrat tabular-nums">
                      <span>{Math.floor(currentCalories)} kcal</span>
                   </div>
                   <Button variant="destructive" size="lg" className="w-full rounded-full" onClick={stopTracking}>
                      <Square className="w-5 h-5 me-2" /> إيقاف النشاط
                   </Button>
                 </>
               ) : (
                 <>
                   <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                      <Play className="w-8 h-8 ms-1" />
                   </div>
                   <h3 className="text-lg font-medium mb-1">جاهز للانطلاق؟</h3>
                   <p className="text-muted-foreground text-sm mb-6 max-w-[250px]">ابدأ تسجيل مسارك، وحلل سرعتك والسعرات المحروقة.</p>
                   <Button size="lg" className="w-full rounded-full" onClick={() => setDrawerOpen(true)}>
                      بدء نشاط جديد
                   </Button>
                 </>
               )}
            </div>
         </AppCard>
      </Section>
      <Section label="النشاط الأسبوعي" className="mt-8">
        <FitnessActivityChart />
      </Section>
      <ResponsiveDrawer open={drawerOpen} onOpenChange={setDrawerOpen} title="اختر نوع النشاط">
         <div className="p-4 grid grid-cols-2 gap-4">
            <AppCard pressable className="p-6 flex flex-col items-center gap-3 text-center" onClick={() => { startTracking('walking'); setDrawerOpen(false); }}>
               <div className="text-primary"><MapPin className="w-8 h-8" /></div>
               <span className="font-medium">مشي</span>
            </AppCard>
            <AppCard pressable className="p-6 flex flex-col items-center gap-3 text-center" onClick={() => { startTracking('running'); setDrawerOpen(false); }}>
               <div className="text-primary"><Play className="w-8 h-8" /></div>
               <span className="font-medium">جري</span>
            </AppCard>
         </div>
      </ResponsiveDrawer>
    </PageShell>
  );
}
