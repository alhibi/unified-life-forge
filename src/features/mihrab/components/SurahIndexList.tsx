/**
 * SurahIndexList — the one searchable index of the 114 sūrahs.
 *
 * Extracted because two routes need the same reading entry: /quran (the
 * canonical index, reading-first) and /tafsir (the reader's sūrah picker).
 * Both used to carry their own copy of the 114 names; /tafsir's picker also
 * fetched its list over the network just to render a chooser.
 *
 * The data is local, so this surface works offline and its empty state is a
 * real search state — never a spinner-for-a-network-list.
 *
 * The row is intentionally quiet: a literary number in Arabic-Indic digits,
 * the sūrah name, its revelation place and ayah count. No per-row icon plate —
 * a 114-row index is a reference surface, not an app launcher.
 */
import { useMemo, useState } from 'react';

import { AppList } from '@/components/ui/app-shell';
import { StateView } from '@/components/ui/state-view';
import { ChevronLeft, Search, X } from '@/lib/icons';

import { SURAH_INDEX, type SurahMeta,TOTAL_AYAHS } from '../data/surahIndex';
import { arabicDigits } from '../lib/arabicDigits';

/** Arabic-Indic digits for the numeric query matcher below. */
const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/** Arabic-normalised match (alef/ya/ta-marbuta + tashkeel stripped). */
function normalize(input: string): string {
  return input
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/[\u0623\u0625\u0622]/g, '\u0627')
    .replace(/\u0649/g, '\u064A')
    .replace(/\u0629/g, '\u0647')
    .trim();
}

function matches(surah: SurahMeta, query: string): boolean {
  if (!query) return true;
  if (normalize(surah.name).includes(query)) return true;
  const numeric = Number(query.replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d))));
  return Number.isInteger(numeric) && numeric === surah.number;
}

export interface SurahIndexListProps {
  /** 1-based sūrah number. */
  onSelect: (surahNumber: number) => void;
  /** Render only the list, without the search field (e.g. inside a dialog). */
  hideSearch?: boolean;
  searchPlaceholder?: string;
  className?: string;
  /** Show the total sūrah / ayah count under the list. */
  showTotal?: boolean;
  autoFocus?: boolean;
}

export default function SurahIndexList({
  onSelect,
  hideSearch = false,
  searchPlaceholder = 'ابحث عن سورة بالاسم أو الرقم',
  className,
  showTotal = false,
  autoFocus = false,
}: SurahIndexListProps) {
  const [query, setQuery] = useState('');

  const normalized = normalize(query);
  const results = useMemo(
    () => SURAH_INDEX.filter((surah) => matches(surah, normalized)),
    [normalized],
  );

  return (
    <div className={className}>
      {!hideSearch && (
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 start-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            autoFocus={autoFocus}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label="ابحث عن سورة"
            enterKeyHint="go"
            className="app-control h-11 w-full ps-10 pe-12 text-meta"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && results.length > 0) onSelect(results[0].number);
            }}
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="مسح البحث"
              className="absolute top-1/2 end-1 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors duration-fast hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      )}

      {results.length === 0 ? (
        <StateView
          kind="search"
          compact
          className="mt-3"
          title="لا سورة بهذا الاسم"
          body="لم يطابق بحثك اسم سورة ولا رقمها. جرّب اسماً مختصراً، أو رقماً بين ١ و١١٤."
        />
      ) : (
        <nav aria-label="فهرس سور القرآن" className={hideSearch ? undefined : 'mt-3'}>
          <AppList compact>
            {results.map((surah) => (
              <button
                key={surah.number}
                type="button"
                onClick={() => onSelect(surah.number)}
                className="app-row app-row-interactive app-focus-ring w-full text-start"
              >
                <span
                  className="w-7 shrink-0 text-mini font-semibold tabular-nums text-muted-foreground-subtle"
                  aria-hidden
                >
                  {arabicDigits(surah.number)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-semibold text-foreground">
                    {surah.name}
                  </span>
                  <span className="block truncate text-mini text-muted-foreground">
                    {surah.place === 'makkah' ? 'مكية' : 'مدنية'} ·{' '}
                    {arabicDigits(surah.ayahs)} آية
                  </span>
                </span>
                <ChevronLeft
                  className="h-4 w-4 shrink-0 text-muted-foreground-subtle"
                  aria-hidden
                />
              </button>
            ))}
          </AppList>
        </nav>
      )}

      {showTotal && results.length > 0 && (
        <p className="mt-3 text-center text-micro tabular-nums text-muted-foreground-subtle">
          {arabicDigits(SURAH_INDEX.length)} سورة · {arabicDigits(TOTAL_AYAHS)} آية
        </p>
      )}
    </div>
  );
}
