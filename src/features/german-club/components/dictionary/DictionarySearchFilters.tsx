import React from 'react';

import { ArrowUpDown, Filter, Layers,RotateCcw, Search, X } from '@/lib/icons';

import { DICTIONARY_CATEGORIES } from '../../lib/dictionaryData';
import {
  CEFRLevel,
  DictionarySortOption,
  DictionarySortOptionLabels,
  DictionaryWordType,
  GermanGender,
  GrammaticalCase,
} from '../../types';
import { useDictionaryStore } from '../../useDictionaryStore';

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
    selectedSort,
    setSelectedSort,
    selectedCase,
    setSelectedCase,
    onlySeparableVerbs,
    setOnlySeparableVerbs,
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

  const activeCategoryObj = DICTIONARY_CATEGORIES.find((cat) => cat.id === selectedCategory);

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="ابحث عن كلمة، معنى بالعربية، صيغة جمع، أو تراكيب لغوية..."
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
          <span className="text-stone-500 flex-shrink-0 font-medium">عمليات بحث سابقة:</span>
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
            مسح الكل
          </button>
        </div>
      )}

      {/* Lexical Domain Categories (المجالات المعجمية) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[0.7rem] font-bold text-stone-500 uppercase tracking-wider px-1">
          <span className="flex items-center gap-1">
            <Layers className="w-3 h-3 text-[#17324D]" />
            التصنيف حسب المجال المعجمي والأكاديمي
          </span>
          {activeCategoryObj && activeCategoryObj.id !== 'all' && (
            <span className="text-[#17324D] text-xs font-semibold">
              {activeCategoryObj.description_ar}
            </span>
          )}
        </div>

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
      </div>

      {/* Sorting & Advanced Grammatical Filters Controls */}
      <div className="p-3.5 rounded-2xl border border-stone-300/60 bg-stone-100/60 space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Sorting Control */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-stone-700 font-bold">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#17324D]" />
              <span>طريقة الفرز:</span>
            </div>
            <select
              value={selectedSort}
              onChange={(e) => setSelectedSort(e.target.value as DictionarySortOption)}
              className="px-2.5 py-1.5 rounded-xl border border-stone-300 bg-white text-stone-800 font-bold focus:outline-none focus:ring-1 focus:ring-[#17324D]"
            >
              {Object.entries(DictionarySortOptionLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Filters */}
          <button
            type="button"
            onClick={resetFilters}
            className="px-3 py-1.5 rounded-xl border border-stone-300/80 bg-stone-200/60 hover:bg-stone-300/60 text-stone-700 font-bold transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            إعادة الضبط
          </button>
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-stone-200">
          <div className="flex items-center gap-1.5 text-stone-600 font-medium me-1">
            <Filter className="w-3 h-3 text-[#17324D]" />
            <span>فلترة نحوية:</span>
          </div>

          {/* CEFR Level Select */}
          <select
            value={selectedCEFR}
            onChange={(e) => setSelectedCEFR(e.target.value as CEFRLevel | 'all')}
            className="px-2.5 py-1.5 rounded-xl border border-stone-300 bg-white text-stone-800 font-medium focus:outline-none"
          >
            <option value="all">كل المستويات المعيارية (A1 - C2)</option>
            <option value="A1">A1 — مبتدئ</option>
            <option value="A2">A2 — أساسي</option>
            <option value="B1">B1 — متوسط</option>
            <option value="B2">B2 — فوق المتوسط</option>
            <option value="C1">C1 — متقدم</option>
            <option value="C2">C2 — طليق/متقن</option>
          </select>

          {/* Word Type Select */}
          <select
            value={selectedWordType}
            onChange={(e) => setSelectedWordType(e.target.value as DictionaryWordType | 'all')}
            className="px-2.5 py-1.5 rounded-xl border border-stone-300 bg-white text-stone-800 font-medium focus:outline-none"
          >
            <option value="all">كل أقسام الكلام</option>
            <option value="noun">اسم (Nomen)</option>
            <option value="verb">فعل (Verb)</option>
            <option value="adjective">صفة (Adjektiv)</option>
            <option value="adverb">ظرف (Adverb)</option>
            <option value="preposition">حرف جر (Präposition)</option>
            <option value="conjunction">حرف عطف (Konjunktion)</option>
            <option value="pronoun">ضمير (Pronomen)</option>
            <option value="expression">تعبير (Ausdruck)</option>
            <option value="idiom">مصطلح (Redewendung)</option>
          </select>

          {/* Gender Select */}
          <select
            value={selectedGender}
            onChange={(e) => setSelectedGender(e.target.value as GermanGender | 'all')}
            className="px-2.5 py-1.5 rounded-xl border border-stone-300 bg-white text-stone-800 font-medium focus:outline-none"
          >
            <option value="all">كل الأجناس اللغوية</option>
            <option value="der">Der (مذكر)</option>
            <option value="die">Die (مؤنث)</option>
            <option value="das">Das (محايد)</option>
            <option value="plural">Plural (جمع)</option>
          </select>

          {/* Preposition Case Select */}
          <select
            value={selectedCase}
            onChange={(e) => setSelectedCase(e.target.value as GrammaticalCase | 'all')}
            className="px-2.5 py-1.5 rounded-xl border border-stone-300 bg-white text-stone-800 font-medium focus:outline-none"
          >
            <option value="all">كل حالات الإعراب (Fall)</option>
            <option value="accusative">Akkusativ (منصوب)</option>
            <option value="dative">Dativ (مجرور)</option>
            <option value="genitive">Genitiv (مضاف إليه)</option>
            <option value="two_way">Wechselpräposition (مزدوج)</option>
          </select>

          {/* Separable Verb Toggle */}
          <button
            type="button"
            onClick={() => setOnlySeparableVerbs(!onlySeparableVerbs)}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all border ${
              onlySeparableVerbs
                ? 'bg-[#17324D] text-white border-[#17324D] shadow-xs'
                : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-200/60'
            }`}
          >
            أفعال منفصلة فقط (Trennbare Verben)
          </button>
        </div>
      </div>
    </div>
  );
};
