import React from 'react';
import { Link } from 'react-router-dom';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { AppList, PageShell } from '@/components/ui/app-shell';
import { Button } from '@/components/ui/button';
import { arabicDigits } from '@/features/mihrab/lib/arabicDigits';
import { BookOpen, ChevronLeft } from '@/lib/icons';

/**
 * /section/quran-virtues — a reading list of the virtues of the Qur'an.
 *
 * The previous version opened with a ten-chip grid of sūrah names; tapping one
 * flashed «قريباً» and did nothing (a dead CTA), and the grid was the loudest
 * thing on a page whose actual content is fourteen short texts. That section is
 * gone. What remains is one quiet numbered reading list, plus a real next step
 * into the muṣḥaf index.
 *
 * The virtue texts are unchanged, verbatim.
 */
const quranVirtues = [
  'أن أهل القرآن هم أهل الله',
  'أن ثواب تلاوة القرآن أعظم من أنفس أموال الدنيا',
  'أن كل حرف فيه بعشر حسنات',
  'أنه يورث الإنسان الراحة والذكر الحسن في السماء والأرض',
  'أن كل آية يحفظها المسلم يرفعه الله بها درجة في الجنة',
  'أن الماهر بالقرآن يقرنه الله تعالى بأفضل الملائكة',
  'أن أفضل الناس هو من يتعلم القرآن ويعلمه',
  'أن الله تعالى لا يعذب إنسانًا حفظ القرآن وعمل به',
  'أنه يأتي شفيقًا لأصحابه الذين كانوا يعملون به في الدنيا',
  'أن صاحب القرآن رفعه النبي صلى الله عليه وسلم إلى مراتب العلماء',
  'أن صاحب القرآن يكرمه الله عز وجل عليه وعلى والديه يوم القيامة بأنواع عظيمة من التكريم',
  'أن القرآن هو من أعظم القربات التي يتقرب بها إلى الله وأحبها إليه',
  'أن الخلق كلهم يكتبون في كل ليلة من الغافلين إلا من قرأ القرآن',
  'أن البيت الذي يقرأ فيه القرآن تحصل فيه الخيرات والبركات ويحفظ الله تعالى أهل هذا البيت من كل سوء',
];

export default function QuranVirtues() {
  return (
    <PageShell
      header={
        <PageHeader
          variant="display"
          title="فضائل القرآن"
          subtitle="أربع عشرة فضيلة في تلاوة القرآن وحفظه وأهله"
          backFallback="/sunnah"
        />
      }
    >
      <SEO title="فضائل القرآن الكريم — SmartHub" description="فضائل تلاوة وحفظ القرآن الكريم وأهل القرآن مع سور مختارة." path="/section/quran-virtues" />

      <section aria-label="فضائل القرآن">
        <AppList>
          {quranVirtues.map((virtue, index) => (
            <div key={index} className="app-row items-start">
              <span
                className="w-8 shrink-0 pt-0.5 text-mini font-semibold tabular-nums text-muted-foreground-subtle"
                aria-hidden
              >
                {arabicDigits(index + 1)}
              </span>
              <p className="flex-1 text-body leading-loose text-foreground">{virtue}</p>
            </div>
          ))}
        </AppList>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-track pt-4">
        <p className="text-meta text-muted-foreground">
          اقرأ السور كاملةً في فهرس المصحف.
        </p>
        <Button asChild variant="outline">
          <Link to="/quran">
            <BookOpen className="h-4 w-4" aria-hidden />
            فهرس المصحف
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>
    </PageShell>
  );
}
