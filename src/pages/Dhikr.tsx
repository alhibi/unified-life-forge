import React from 'react';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { PageShell } from '@/components/ui/app-shell';
import DhikrTab from './mihrab/DhikrTab';

export default function DhikrPage() {
  return (
    <PageShell flush centered={false} className="px-4 pt-2">
      <SEO
        title="الذكر والأذكار — حصن المسلم والتسبيح"
        description="أذكار الصباح والمساء واليوم الليلة، عداد التسبيح الإلكتروني ومجموعة الأدعية والأذكار."
        path="/dhikr"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'الذكر والأذكار',
          description: 'أذكار الصباح والمساء واليوم الليلة، عداد التسبيح الإلكتروني ومجموعة الأدعية والأذكار.',
          url: 'https://amv.life/dhikr',
        }}
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pb-page">
        <PageHeader
          title="الذكر والأذكار"
          subtitle="حصن المسلم والتسبيح"
          backFallback="/"
        />
        <main className="w-full">
          <DhikrTab />
        </main>
      </div>
    </PageShell>
  );
}
