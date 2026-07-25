/**
 * SurahJump — search the 114 sūrahs and open the reader at that sūrah.
 *
 * The Quran tab used to be two link cards, so reaching a specific sūrah meant:
 * tap "التفسير", wait for the reader, open its picker, scroll. This collapses
 * that to one search box on the tab itself. `/tafsir?surah=N` is already the
 * reader's own URL contract (it reads `searchParams.get('surah')`), so this adds
 * no coupling — it uses the public entry point.
 *
 * Matching is Arabic-normalised (alef/ya/ta-marbuta + tashkeel stripped) and
 * also accepts the sūrah NUMBER, because plenty of people think in numbers.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { AppCard } from '@/components/ui/app-shell';
import { ChevronLeft, Search, X } from '@/lib/icons';
import { cn } from '@/lib/utils';

import { SURAH_INDEX } from '../data/surahIndex';

const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
function arabicNumber(n: number): string {
  return String(Math.trunc(n))
    .split('')
    .map((c) => AR_DIGITS[Number(c)] ?? c)
    .join('');
}

/** Same normaliser the portal search uses, kept local to avoid a cross-import. */
function normalize(input: string): string {
  return input
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/[\u0623\u0625\u0622]/g, '\u0627')
    .replace(/\u0649/g, '\u064A')
    .replace(/\u0629/g, '\u0647')
    .trim();
}

const MAX_RESULTS = 8;

export default function SurahJump() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = normalize(query);
    if (!q) return [];
    // Numeric query: jump straight to that sūrah number.
    const asNumber = Number(q.replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d))));
    if (Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= 114) {
      return [SURAH_INDEX[asNumber - 1]];
    }
    return SURAH_INDEX.filter((s) => normalize(s.name).includes(q)).slice(0, MAX_RESULTS);
  }, [query]);

  return (
    <AppCard as="section" aria-label="الانتقال إلى سورة">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 start-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="اذهب إلى سورة — بالاسم أو بالرقم"
          aria-label="ابحث عن سورة"
          enterKeyHint="go"
          className="app-control h-11 w-full ps-10 pe-10 text-meta"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && results.length > 0) {
              navigate(`/tafsir?surah=${results[0].number - 1}`);
            }
          }}
        />
        {query.length > 0 && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="مسح البحث"
            className="absolute top-1/2 end-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors duration-fast hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      {query.length > 0 && (
        <ul className="mt-2 space-y-1" role="listbox" aria-label="نتائج السور">
          {results.length === 0 && (
            <li className="px-1 py-2 text-mini text-muted-foreground">لا سورة بهذا الاسم.</li>
          )}
          {results.map((surah) => (
            <li key={surah.number}>
              <button
                type="button"
                // The reader indexes sūrahs from zero internally; its URL
                // contract follows that, hence number − 1.
                onClick={() => navigate(`/tafsir?surah=${surah.number - 1}`)}
                className={cn(
                  'flex min-h-11 w-full items-center gap-3 rounded-md px-2 text-start',
                  'transition-colors duration-fast hover:bg-muted/60',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                )}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-border text-micro font-semibold tabular-nums text-muted-foreground">
                  {arabicNumber(surah.number)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-meta font-semibold text-foreground">{surah.name}</span>
                  <span className="block text-mini text-muted-foreground">
                    {surah.place === 'makkah' ? 'مكية' : 'مدنية'} · {arabicNumber(surah.ayahs)} آية
                  </span>
                </span>
                <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </AppCard>
  );
}
