import React from 'react';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { PageShell } from '@/components/ui/app-shell';

import SunnahTab from './mihrab/SunnahTab';

export default function SunnahPage() {
  return (
    <PageShell flush centered={false} className="px-4 pt-2">
      <SEO
        title="السنة النبوية — السنن واليوم النبوي"
        description="السنن المؤقتة وغير المؤقتة، وتفاصيل اليوم النبوي الشريف الشاملة."
        path="/sunnah"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'السنة النبوية',
          description: 'السنن المؤقتة وغير المؤقتة، وتفاصيل اليوم النبوي الشريف الشاملة.',
          url: 'https://amv.life/sunnah',
        }}
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pb-page">
        <PageHeader
          title="السنة النبوية"
          subtitle="السنن اليومية واليوم النبوي"
          backFallback="/"
        />
        <main className="w-full">
          <SunnahTab />
        </main>
      </div>
    </PageShell>
  );
}
