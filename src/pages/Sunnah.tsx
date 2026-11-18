import React from 'react';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { PageShell } from '@/components/ui/app-shell';

import SunnahTab from './mihrab/SunnahTab';

export default function SunnahPage() {
  return (
    <PageShell
      header={
        <PageHeader title="السنة النبوية" subtitle="السنن اليومية واليوم النبوي" backFallback="/mihrab" />
      }
    >
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

      <SunnahTab />
    </PageShell>
  );
}