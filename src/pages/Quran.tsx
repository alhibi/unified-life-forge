import React from 'react';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { PageShell } from '@/components/ui/app-shell';
import QuranTab from './mihrab/QuranTab';

export default function QuranPage() {
  return (
    <PageShell flush centered={false} className="px-4 pt-2">
      <SEO
        title="القرآن الكريم — المصحف الشريف والتلاوة"
        description="تلاوة القرآن الكريم، الحفظ والورد اليومي وتفسير الآيات الكريمة."
        path="/quran"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'القرآن الكريم',
          description: 'تلاوة القرآن الكريم، الحفظ والورد اليومي وتفسير الآيات الكريمة.',
          url: 'https://amv.life/quran',
        }}
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pb-page">
        <PageHeader
          title="القرآن الكريم"
          subtitle="المصحف الشريف والتلاوة"
          backFallback="/"
        />
        <main className="w-full">
          <QuranTab />
        </main>
      </div>
    </PageShell>
  );
}
