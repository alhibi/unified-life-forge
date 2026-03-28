import React from 'react';
import { useApp } from '@/contexts/AppContext';
import DualCalendar from '@/components/DualCalendar';
import AudioPlayer from '@/components/AudioPlayer';
import LocationSaver from '@/components/LocationSaver';

export default function Index() {
  const { t } = useApp();

  return (
    <div className="min-h-screen bg-background pb-24 px-4 pt-6">
      <h1 className="text-2xl font-display font-bold text-foreground mb-1 animate-fade-in">
        {t('app.title')}
      </h1>
      <p className="text-sm text-muted-foreground mb-5 animate-fade-in">
        {t('calendar.today')}: {new Date().toLocaleDateString()}
      </p>

      <div className="space-y-4 max-w-lg mx-auto">
        <DualCalendar />
        <AudioPlayer />
        <LocationSaver />
      </div>
    </div>
  );
}
