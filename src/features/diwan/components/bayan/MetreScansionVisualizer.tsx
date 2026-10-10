import React from 'react';

import type { PoeticMeterAnalysis } from '../../types/bayan';

interface MetreScansionVisualizerProps {
  prosody: PoeticMeterAnalysis;
}

/**
 * رسم العروض (التقطيع) — محتوى بيانات: المقاطع والتفعيلات والزحافات
 * تبقى بألوانها ودلالاتها. الغلاف فقط من التوكنز: كانت كل درجات
 * "live" أصنافًا غير معرّفة في الـ CSS (لا تُولّد أي قاعدة) فصُحّحت
 * إلى لون الإبراز الأساسي، وأُزيل الظل الخام عن مربع المقطع المتحرك.
 */
export const MetreScansionVisualizer: React.FC<MetreScansionVisualizerProps> = ({ prosody }) => {
  const renderHemistich = (title: string, data: typeof prosody.firstHemistich) => {
    return (
      <div className="space-y-4 rounded-xl border border-border/40 bg-muted/20 p-4">
        <div className="mb-3 flex items-center justify-between border-b border-border/40 pb-2">
          <span className="text-mini font-semibold text-muted-foreground">{title}</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-micro text-primary">
            {data.scansionText.split(' ').length} تفعيلات
          </span>
        </div>

        {/* Original Line */}
        <div className="font-amiri text-body font-medium tracking-wide text-foreground">
          {data.text}
        </div>

        {/* Arood Translit Writing */}
        <div className="rounded-md border border-border/30 bg-muted/30 px-3 py-1.5 font-amiri text-meta text-primary/90">
          <span className="mb-0.5 block text-micro text-muted-foreground">الكتابة العروضية:</span>
          {data.scansionText}
        </div>

        {/* Syllables & Symbols Grid */}
        <div className="flex flex-wrap gap-2 pt-2">
          {data.tafilas.map((tafila, idx) => (
            <div
              key={idx}
              className="flex min-w-[120px] flex-1 flex-col items-center rounded-lg border border-border bg-background p-2.5"
            >
              {/* Tafila Name */}
              <span className="mb-1 font-amiri text-meta font-bold text-foreground">
                {tafila.tafilaName}
              </span>

              {/* Symbol Blocks */}
              <div className="my-2 flex justify-center gap-1.5">
                {tafila.symbolPattern.split('').map((sym, symIdx) => (
                  <div
                    key={symIdx}
                    className={`flex h-6 w-6 items-center justify-center rounded font-mono text-mini font-semibold transition-motion ${
                      sym === '/'
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border bg-muted-foreground/15 text-muted-foreground'
                    }`}
                  >
                    {sym}
                  </div>
                ))}
              </div>

              {/* Syllable details list */}
              <div className="flex max-w-full flex-wrap justify-center gap-1 font-mono text-micro text-muted-foreground">
                {tafila.syllables.map((s, sIdx) => (
                  <span
                    key={sIdx}
                    className="rounded bg-muted/40 px-1 py-0.5"
                    title={s.isMoving ? 'متحرك' : 'ساكن'}
                  >
                    {s.text}
                  </span>
                ))}
              </div>

              {/* Deviations */}
              {tafila.deviation && (
                <span className="mt-1.5 rounded-full bg-signal/10 px-1.5 py-0.5 font-mono text-micro text-signal">
                  {tafila.deviation}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Meter Header Metadata card */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4 md:flex-row md:items-center">
        <div>
          <span className="block font-mono text-mini font-semibold uppercase tracking-wider text-primary">
            بحر البيت الشعري
          </span>
          <h3 className="mt-0.5 font-amiri text-title font-bold text-foreground">
            {prosody.meterName}
          </h3>
          <p className="mt-1 max-w-xl font-amiri text-mini text-muted-foreground">
            مفتاح البحر: {prosody.keyPoem}
          </p>
        </div>

        <div className="flex flex-row items-end gap-3 md:flex-col md:items-end md:gap-1.5">
          <div className="text-end">
            <span className="block text-micro text-muted-foreground">الروي</span>
            <span className="font-amiri text-body font-bold text-foreground">
              حرف ({prosody.rhymeLetter})
            </span>
          </div>
          <div className="text-end">
            <span className="block text-micro text-muted-foreground">القافية</span>
            <span className="font-amiri text-mini font-medium text-primary">{prosody.rhymeType}</span>
          </div>
        </div>
      </div>

      {/* Split views of Hemistiches */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {renderHemistich('الصدر (الشطر الأول)', prosody.firstHemistich)}
        {renderHemistich('العجز (الشطر الثاني)', prosody.secondHemistich)}
      </div>
    </div>
  );
};
