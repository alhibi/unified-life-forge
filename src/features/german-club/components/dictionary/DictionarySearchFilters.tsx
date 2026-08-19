import React from 'react';
import { Search, X, RotateCcw, Filter, Sparkles } from '@/lib/icons';
import { DICTIONARY_CATEGORIES } from '../../lib/dictionaryData';
import { useDictionaryStore } from '../../useDictionaryStore';
import { CEFRLevel, DictionaryWordType, GermanGender, CEFRLevelLabels, DictionaryWordTypeLabels } from '../../types';

export const DictionarySearchFilters: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedCEFR,
    setSelectedCEFR,
    selectedWordType,
    setSelectedWordType,
    selectedGender,
    setSelectedGender,
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
    resetFilters,
  } = useDictionaryStore();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      addRecentSearch(searchQuery.trim());
    }
  };

  return (
    <div className="space-y-4">
      {/* Primary Search Input */}
      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="ابحث عن كلمة ألمانية أو معنى بالعربية أو IPA..."
          className="w-full pe-12 ps-10 py-3.5 rounded-2xl border border-stone-300 bg-white text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#17324D]/30 focus:border-[#17324D] text-sm font-medium shadow-xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-xl hover:bg-stone-200 text-stone-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Recent Searches Chips */}
      {recentSearches.length > 0 && !searchQuery && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-stone-500 flex-shrink-0 font-medium">بحث سابق:</span>
          {recentSearches.map((term, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSearchQuery(term)}
              className="px-2.5 py-1 rounded-full bg-stone-200/80 hover:bg-stone-300 text-stone-700 flex-shrink-0 transition-colors"
            >
              {term}
            </button>
          ))}
          <button
            type="button"
            onClick={clearRecentSearches}
            className="text-[0.625rem] text-stone-400 hover:text-stone-600 underline flex-shrink-0"
          >
            مسح
          </button>
        </div>
      )}

      {/* Category Horizontal Pill Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {DICTIONARY_CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 border ${
                isActive
                  ? 'bg-[#17324D] text-white border-[#17324D] shadow-xs'
                  : 'bg-stone-100 text-stone-700 border-stone-300/80 hover:bg-stone-200/60'
              }`}
            >
              {cat.label_ar}
            </button>
          );
        })}
      </div>

      {/* Dropdown Filters row */}
      <div className="p-3.5 rounded-2xl border border-stone-300/60 bg-stone-100/60 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-stone-700 font-bold">
          <Filter className="w-3.5 h-3.5 text-[#17324D]" />
          <span>تصفية النتائج:</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* CEFR Level Select */}
          <select
            value={selectedCEFR}
            onChange={(e) => setSelectedCEFR(e.target.value as CEFRLevel | 'all')}
            className="px-2.5 py-1.5 rounded-xl border border-stone-300 bg-white text-stone-800 font-medium focus:outline-none"
          >
            <option value="all">كل المستويات (A1 - C2)</option>
            <option value="A1">A1 — مبتدئ</option>
            <option value="A2">A2 — أساسي</option>
            <option value="B1">B1 — متوسط</option>
            <option value="B2">B2 — فوق المتوسط</option>
            <option value="C1">C1 — متقدم</option>
            <option value="C2">C2 — طليق</option>
          </select>

          {/* Word Type Select */}
          <select
            value={selectedWordType}
            onChange={(e) => setSelectedWordType(e.target.value as DictionaryWordType | 'all')}
            className="px-2.5 py-1.5 rounded-xl border border-stone-300 bg-white text-stone-800 font-medium focus:outline-none"
          >
            <option value="all">كل أنواع الكلمات</option>
            <option value="noun">اسم (Nomen)</option>
            <option value="verb">فعل (Verb)</option>
            <option value="adjective">صفة (Adjektiv)</option>
            <option value="adverb">ظرف (Adverb)</option>
            <option value="preposition">حرف جر (Präposition)</option>
            <option value="conjunction">حرف عطف (Konjunktion)</option>
            <option value="expression">تعبير (Ausdruck)</option>
          </select>

          {/* Gender Select */}
          <select
            value={selectedGender}
            onChange={(e) => setSelectedGender(e.target.value as GermanGender | 'all')}
            className="px-2.5 py-1.5 rounded-xl border border-stone-300 bg-white text-stone-800 font-medium focus:outline-none"
          >
            <option value="all">كل الأجناس</option>
            <option value="der">Der (مذكر)</option>
            <option value="die">Die (مؤنث)</option>
            <option value="das">Das (محايد)</option>
          </select>

          {/* Reset Filters Button */}
          <button
            type="button"
            onClick={resetFilters}
            className="p-1.5 rounded-xl border border-stone-300/80 bg-stone-200/60 hover:bg-stone-300/60 text-stone-600 transition-colors"
            title="إعادة ضبط الفلاتر"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
