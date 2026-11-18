/**
 * /quran — the Qur'an entry surface.
 *
 * Reading-first: the page is the muṣḥaf index (114 real sūrahs, locally known
 * counts and revelation place), with one resume affordance when the reader has
 * a saved position. It is NOT a duplicate of the Mihrab → Qur'an tab: that tab
 * owns the daily practice (wird commitment, streak, quick jump); this route
 * owns "which sūrah do I read now".
 *
 * Scripture is never rendered on this surface — the reader is /tafsir. The
 * index stays a quiet reference column: search, then rows, then a total line.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import PageHeader from '@/components/PageHeader';
import SEO from '@/components/SEO';
import { AppList, AppRow, IconChip, PageShell } from '@/components/ui/app-shell';
import SurahIndexList from '@/features/mihrab/components/SurahIndexList';
import { SURAH_INDEX } from '@/features/mihrab/data/surahIndex';
import { arabicDigits } from '@/features/mihrab/lib/arabicDigits';
import { RotateCcw } from '@/lib/icons';

interface LastTafsirPosition {
  surah: number;
  ayah: number | null;
  tafsirId: string;
}

/** The reader's saved position (the reader owns the key; this is read-only). */
function readLastPosition(): LastTafsirPosition | null {
  try {
    const raw = localStorage.getItem('tafsir-state');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.surah === 'number') return parsed as LastTafsirPosition;
    return null;
  } catch {
    return null;
  }
}

export default function QuranPage() {
  const navigate = useNavigate();
  // Read once on mount: leaving the page unmounts it, so there is nothing to
  // keep in sync with the reader.
  const [lastPos] = useState<LastTafsirPosition | null>(readLastPosition);

  // The reader's URL contract is 0-based internally (?surah=0 = Al-Fātiḥah).
  const openSurah = (surahNumber: number) =>
    navigate('/tafsir?surah=' + String(surahNumber - 1));
  const resume = () => {
    if (!lastPos) return;
    const params = new URLSearchParams({ surah: String(lastPos.surah) });
    if (lastPos.ayah) params.set('ayah', String(lastPos.ayah));
    navigate('/tafsir?' + params.toString());
  };

  const lastSurah = lastPos ? SURAH_INDEX[lastPos.surah] : null;

  return (
    <PageShell
      header={
        <PageHeader
          variant="display"
          hideBack
          title="القرآن الكريم"
          subtitle="فهرس السور — اختر سورة لتلاوتها وتفسيرها"
        />
      }
    >
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

      {lastPos && lastSurah && (
        <AppList aria-label="متابعة القراءة">
          <AppRow
            onClick={resume}
            chevron
            leading={
              <IconChip tone="plain" aria-hidden>
                <RotateCcw className="h-5 w-5" />
              </IconChip>
            }
            title="متابعة القراءة"
            subtitle={
              lastSurah.name +
              (lastPos.ayah ? ' — الآية ' + arabicDigits(lastPos.ayah) : '')
            }
          />
        </AppList>
      )}

      <SurahIndexList onSelect={openSurah} showTotal />
    </PageShell>
  );
}
