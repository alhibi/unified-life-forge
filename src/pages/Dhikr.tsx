import React from 'react';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { PageShell } from '@/components/ui/app-shell';

import DhikrTab from './mihrab/DhikrTab';

export default function DhikrPage() {
  return (
    <PageShell
      header={
        <PageHeader title="الذكر والأذكار" subtitle="حصنة المسلم والتسبيح" backFallback="/mihrab" />
      }
    >
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

      <DhikrTab />
    </PageShell>
  );
}