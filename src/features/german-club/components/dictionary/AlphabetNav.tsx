import React from 'react';

import { useDictionaryStore } from '../../useDictionaryStore';

const ALPHABET = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
];

const AlphabetNavImpl: React.FC = () => {
  const selectedLetter = useDictionaryStore((s) => s.selectedLetter);
  const setSelectedLetter = useDictionaryStore((s) => s.setSelectedLetter);

  return (
    <div className="scrollbar-none flex items-center gap-1 overflow-x-auto pb-2 font-mono text-mini">
      <button
        type="button"
        onClick={() => setSelectedLetter('all')}
        className={`flex h-11 flex-shrink-0 items-center justify-center rounded-md border px-3 font-bold transition-motion ${
          selectedLetter === 'all'
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-track bg-secondary/40 text-foreground hover:bg-secondary'
        }`}
      >
        الكل (A-Z)
      </button>

      {ALPHABET.map((letter) => {
        const isActive = selectedLetter.toUpperCase() === letter;
        return (
          <button
            key={letter}
            type="button"
            onClick={() => setSelectedLetter(letter)}
            className={`flex h-11 min-w-11 flex-shrink-0 items-center justify-center rounded-md border font-bold transition-motion ${
              isActive
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-track bg-secondary/40 text-foreground hover:bg-secondary'
            }`}
          >
            {letter}
          </button>
        );
      })}
    </div>
  );
};

export const AlphabetNav = React.memo(AlphabetNavImpl);
