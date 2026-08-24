import React from 'react';

import { useDictionaryStore } from '../../useDictionaryStore';

const ALPHABET = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
];

export const AlphabetNav: React.FC = () => {
  const { selectedLetter, setSelectedLetter } = useDictionaryStore();

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none text-xs font-mono">
      <button
        type="button"
        onClick={() => setSelectedLetter('all')}
        className={`px-3 py-1.5 rounded-xl font-bold transition-all flex-shrink-0 border ${
          selectedLetter === 'all'
            ? 'bg-[#17324D] text-white border-[#17324D]'
            : 'bg-stone-200/80 text-stone-700 border-stone-300 hover:bg-stone-300/80'
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
            className={`w-8 h-8 rounded-xl font-bold transition-all flex items-center justify-center flex-shrink-0 border ${
              isActive
                ? 'bg-[#17324D] text-white border-[#17324D] shadow-xs'
                : 'bg-stone-100 text-stone-700 border-stone-300/80 hover:bg-stone-200/80'
            }`}
          >
            {letter}
          </button>
        );
      })}
    </div>
  );
};
