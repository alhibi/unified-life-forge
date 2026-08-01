import React, { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format, parseISO } from 'date-fns';
import { AppCard } from '@/components/ui/app-shell';
import { useFitnessStore } from '@/stores/fitnessStore';
export function FitnessActivityChart() {
  const activities = useFitnessStore((state) => state.activities);
  const chartData = useMemo(() => {
    const dataMap = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      dataMap.set(dateStr, 0);
    }
    activities.forEach(activity => {
      const dateStr = activity.start_time.split('T')[0];
      if (dataMap.has(dateStr)) {
         dataMap.set(dateStr, (dataMap.get(dateStr) || 0) + (activity.distance_meters / 1000));
      }
    });
    return Array.from(dataMap.entries()).map(([date, distance]) => ({ date, displayDate: format(parseISO(date), 'dd/MM'), distance: Number(distance.toFixed(2)) }));
  }, [activities]);
  if (activities.length === 0) {
    return (
      <AppCard className="h-64 flex items-center justify-center text-muted-foreground flex-col gap-3">
         <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 9.81h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14.19H4z"/></svg>
         <span>لا توجد بيانات كافية للرسم البياني</span>
      </AppCard>
    );
  }
  return (
    <AppCard className="h-[300px] p-4 pt-6">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorDistance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(value) => `${value} km`} />
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} itemStyle={{ color: 'hsl(var(--foreground))' }} formatter={(value: number) => [`${value} km`, 'المسافة']} labelFormatter={(label) => `التاريخ: ${label}`} />
          <Area type="monotone" dataKey="distance" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorDistance)" />
        </AreaChart>
      </ResponsiveContainer>
    </AppCard>
  );
}
