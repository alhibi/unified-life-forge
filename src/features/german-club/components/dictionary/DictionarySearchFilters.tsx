import React from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowUpDown, Filter, Layers, RotateCcw, Search, X } from '@/lib/icons';

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
        <Search
          className="pointer-events-none absolute top-1/2 start-4 h-5 w-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="ابحث عن كلمة، معنى بالعربية، صيغة جمع، أو تراكيب لغوية..."
          className="h-12 ps-12 pe-12 text-body font-medium"
          aria-label="البحث في القاموس"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute top-1/2 end-2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="مسح البحث"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      {/* Recent Searches Chips */}
      {recentSearches.length > 0 && !searchQuery && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-mini">
          <span className="flex-shrink-0 font-medium text-muted-foreground">
            عمليات بحث سابقة:
          </span>
          {recentSearches.map((term, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSearchQuery(term)}
              className="flex-shrink-0 rounded-full bg-secondary px-2.5 py-1 text-foreground transition-colors hover:bg-secondary/70"
            >
              {term}
            </button>
          ))}
          <button
            type="button"
            onClick={clearRecentSearches}
            className="flex-shrink-0 text-micro text-muted-foreground underline hover:text-foreground"
          >
            مسح الكل
          </button>
        </div>
      )}

      {/* Lexical Domain Categories (المجالات المعجمية) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1 text-micro font-bold uppercase tracking-wider text-muted-foreground">
          <span className="flex items-center gap-1">
            <Layers className="h-3 w-3 text-primary" aria-hidden />
            التصنيف حسب المجال المعجمي والأكاديمي
          </span>
          {activeCategoryObj && activeCategoryObj.id !== 'all' && (
            <span className="text-mini font-semibold text-primary">
              {activeCategoryObj.description_ar}
            </span>
          )}
        </div>

        <div className="scrollbar-none flex items-center gap-2 overflow-x-auto pb-2">
          {DICTIONARY_CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex-shrink-0 rounded-md border px-3.5 py-2 text-mini font-bold transition-motion ${
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-track bg-secondary/40 text-foreground hover:bg-secondary'
                }`}
              >
                {cat.label_ar}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sorting & Advanced Grammatical Filters Controls */}
      <div className="space-y-3 rounded-lg border border-track bg-secondary/40 p-3.5 text-mini">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Sorting Control */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <ArrowUpDown className="h-3.5 w-3.5 text-primary" aria-hidden />
              <span>طريقة الفرز:</span>
            </div>
            <Select
              value={selectedSort}
              onValueChange={(value) => setSelectedSort(value as DictionarySortOption)}
            >
              <SelectTrigger className="w-fit min-w-32" aria-label="طريقة الفرز">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DictionarySortOptionLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reset Filters */}
          <Button variant="secondary" size="sm" className="gap-1.5" onClick={resetFilters}>
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            إعادة الضبط
          </Button>
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="flex flex-wrap items-center gap-2 border-t border-track pt-1">
          <div className="me-1 flex items-center gap-1.5 font-medium text-muted-foreground">
            <Filter className="h-3 w-3 text-primary" aria-hidden />
            <span>فلترة نحوية:</span>
          </div>

          {/* CEFR Level Select */}
          <Select
            value={selectedCEFR}
            onValueChange={(value) => setSelectedCEFR(value as CEFRLevel | 'all')}
          >
            <SelectTrigger className="w-fit" aria-label="المستوى المعياري">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المستويات المعيارية (A1 - C2)</SelectItem>
              <SelectItem value="A1">A1 — مبتدئ</SelectItem>
              <SelectItem value="A2">A2 — أساسي</SelectItem>
              <SelectItem value="B1">B1 — متوسط</SelectItem>
              <SelectItem value="B2">B2 — فوق المتوسط</SelectItem>
              <SelectItem value="C1">C1 — متقدم</SelectItem>
              <SelectItem value="C2">C2 — طليق/متقن</SelectItem>
            </SelectContent>
          </Select>

          {/* Word Type Select */}
          <Select
            value={selectedWordType}
            onValueChange={(value) => setSelectedWordType(value as DictionaryWordType | 'all')}
          >
            <SelectTrigger className="w-fit" aria-label="قسم الكلام">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل أقسام الكلام</SelectItem>
              <SelectItem value="noun">اسم (Nomen)</SelectItem>
              <SelectItem value="verb">فعل (Verb)</SelectItem>
              <SelectItem value="adjective">صفة (Adjektiv)</SelectItem>
              <SelectItem value="adverb">ظرف (Adverb)</SelectItem>
              <SelectItem value="preposition">حرف جر (Präposition)</SelectItem>
              <SelectItem value="conjunction">حرف عطف (Konjunktion)</SelectItem>
              <SelectItem value="pronoun">ضمير (Pronomen)</SelectItem>
              <SelectItem value="expression">تعبير (Ausdruck)</SelectItem>
              <SelectItem value="idiom">مصطلح (Redewendung)</SelectItem>
            </SelectContent>
          </Select>

          {/* Gender Select */}
          <Select
            value={selectedGender}
            onValueChange={(value) => setSelectedGender(value as GermanGender | 'all')}
          >
            <SelectTrigger className="w-fit" aria-label="الجنس اللغوي">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأجناس اللغوية</SelectItem>
              <SelectItem value="der">Der (مذكر)</SelectItem>
              <SelectItem value="die">Die (مؤنث)</SelectItem>
              <SelectItem value="das">Das (محايد)</SelectItem>
              <SelectItem value="plural">Plural (جمع)</SelectItem>
            </SelectContent>
          </Select>

          {/* Preposition Case Select */}
          <Select
            value={selectedCase}
            onValueChange={(value) => setSelectedCase(value as GrammaticalCase | 'all')}
          >
            <SelectTrigger className="w-fit" aria-label="حالة الإعراب">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل حالات الإعراب (Fall)</SelectItem>
              <SelectItem value="accusative">Akkusativ (منصوب)</SelectItem>
              <SelectItem value="dative">Dativ (مجرور)</SelectItem>
              <SelectItem value="genitive">Genitiv (مضاف إليه)</SelectItem>
              <SelectItem value="two_way">Wechselpräposition (مزدوج)</SelectItem>
            </SelectContent>
          </Select>

          {/* Separable Verb Toggle */}
          <button
            type="button"
            onClick={() => setOnlySeparableVerbs(!onlySeparableVerbs)}
            aria-pressed={onlySeparableVerbs}
            className={`rounded-md border px-3 py-1.5 font-bold transition-motion ${
              onlySeparableVerbs
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-track bg-secondary/40 text-foreground hover:bg-secondary'
            }`}
          >
            أفعال منفصلة فقط (Trennbare Verben)
          </button>
        </div>
      </div>
    </div>
  );
};
