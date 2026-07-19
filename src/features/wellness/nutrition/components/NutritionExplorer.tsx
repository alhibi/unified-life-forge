/**
 * NutritionExplorer — The revolutionary nutrition browsing experience.
 *
 * A full-featured food browser with categories, search, filters,
 * detailed nutritional breakdowns, and smart recommendations.
 */
import { AnimatePresence, motion } from 'framer-motion';
import React, { useCallback, useMemo, useState } from 'react';

import { useApp } from '@/contexts/AppContext';
import {
  Apple,
  Brain,
  ChevronLeft,
  Clock,
  Dumbbell,
  Filter,
  Heart,
  Leaf,
  Search,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  X,
} from '@/lib/icons';

import {
  bestProteinSources,
  CATEGORY_INFO,
  FOODS_BY_CATEGORY,
  foodsByTag,
  getFavoriteFoods,
  getRecentFoodItems,
  highestFiberFoods,
  lowestGIFoods,
  mostNutrientDense,
  searchFoods,
  TOTAL_FOOD_COUNT,
  useNutritionCache,
} from '../index';
import type { DietaryTag, NutritionCategory, NutritionFoodItem } from '../types';
import CategoryGrid from './CategoryGrid';
import FoodCard from './FoodCard';
import FoodDetailSheet from './FoodDetailSheet';
import SmartFilters from './SmartFilters';

type Lang = 'ar' | 'de';

type View = 'home' | 'category' | 'search' | 'favorites' | 'smart';

const T = {
  title: { ar: 'استكشاف التغذية', de: 'Ernährung erkunden' },
  searchPlaceholder: { ar: 'ابحث عن طعام، عنصر غذائي...', de: 'Essen, Nährstoff suchen...' },
  categories: { ar: 'التصنيفات', de: 'Kategorien' },
  favorites: { ar: 'المفضلة', de: 'Favoriten' },
  recent: { ar: 'الأخيرة', de: 'Zuletzt' },
  smart: { ar: 'اقتراحات ذكية', de: 'Smarte Vorschläge' },
  noFavorites: { ar: 'لم تضف أي طعام للمفضلة بعد', de: 'Noch keine Favoriten' },
  noRecent: { ar: 'لا يوجد سجل مشاهدات', de: 'Kein Verlauf' },
  noResults: { ar: 'لا نتائج', de: 'Keine Ergebnisse' },
  totalFoods: { ar: 'عنصر غذائي', de: 'Lebensmittel' },
  bestProtein: { ar: 'أفضل مصادر البروتين', de: 'Beste Proteinquellen' },
  highFiber: { ar: 'أعلى الأطعمة بالألياف', de: 'Ballaststoffreichste' },
  lowGI: { ar: 'أقل مؤشر جلايسيمي', de: 'Niedrigster GI' },
  nutrientDense: { ar: 'الأغنى بالمغذيات', de: 'Nährstoffdichteste' },
  antiInflammatory: { ar: 'مضادات الالتهاب', de: 'Entzündungshemmend' },
  brainFood: { ar: 'غذاء الدماغ', de: 'Brainfood' },
  heartHealthy: { ar: 'صحة القلب', de: 'Herzgesund' },
  back: { ar: 'رجوع', de: 'Zurück' },
  filters: { ar: 'فلاتر', de: 'Filter' },
};

const SMART_SECTIONS = [
  { key: 'protein', label: T.bestProtein, icon: Dumbbell, color: '#e53e3e' },
  { key: 'fiber', label: T.highFiber, icon: Leaf, color: '#48bb78' },
  { key: 'lowgi', label: T.lowGI, icon: TrendingUp, color: '#4299e1' },
  { key: 'dense', label: T.nutrientDense, icon: Star, color: '#f6ad55' },
  { key: 'antiinflam', label: T.antiInflammatory, icon: Shield, color: '#9b59b6' },
  { key: 'brain', label: T.brainFood, icon: Brain, color: '#ed8936' },
  { key: 'heart', label: T.heartHealthy, icon: Heart, color: '#e53e3e' },
] as const;

export default function NutritionExplorer() {
  const { language } = useApp();
  const lang: Lang = language === 'ar' ? 'ar' : 'de';
  const isAr = lang === 'ar';

  // Re-render when the cloud-backed favorites / recents cache changes.
  useNutritionCache();

  const [view, setView] = useState<View>('home');
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<NutritionCategory | null>(null);
  const [selectedFood, setSelectedFood] = useState<NutritionFoodItem | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [smartSection, setSmartSection] = useState<string | null>(null);
  const [activeTags, setActiveTags] = useState<DietaryTag[]>([]);

  // Search results
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    let results = searchFoods(query);
    if (activeTags.length > 0) {
      results = results.filter((f) => activeTags.every((t) => f.tags.includes(t)));
    }
    return results;
  }, [query, activeTags]);

  // Category foods
  const categoryFoods = useMemo(() => {
    if (!selectedCategory) return [];
    return FOODS_BY_CATEGORY[selectedCategory] || [];
  }, [selectedCategory]);

  // Smart section foods
  const smartFoods = useMemo(() => {
    switch (smartSection) {
      case 'protein':
        return bestProteinSources(20);
      case 'fiber':
        return highestFiberFoods(20);
      case 'lowgi':
        return lowestGIFoods(20);
      case 'dense':
        return mostNutrientDense(20).map((f) => f as NutritionFoodItem);
      case 'antiinflam':
        return foodsByTag('anti_inflammatory');
      case 'brain':
        return foodsByTag('brain_food');
      case 'heart':
        return foodsByTag('heart_healthy');
      default:
        return [];
    }
  }, [smartSection]);

  const handleCategorySelect = useCallback((cat: NutritionCategory) => {
    setSelectedCategory(cat);
    setView('category');
  }, []);

  const handleFoodSelect = useCallback((food: NutritionFoodItem) => {
    setSelectedFood(food);
  }, []);

  const handleBack = useCallback(() => {
    if (view === 'category' || view === 'search' || view === 'favorites' || view === 'smart') {
      setView('home');
      setSelectedCategory(null);
      setSmartSection(null);
      setQuery('');
    }
  }, [view]);

  const handleSmartSelect = useCallback((key: string) => {
    setSmartSection(key);
    setView('smart');
  }, []);

  // Render header with search
  const renderHeader = () => (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md pb-2 pt-1">
      {view !== 'home' && (
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-sm text-primary mb-2 active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{T.back[lang]}</span>
        </button>
      )}

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value.trim()) setView('search');
          }}
          placeholder={T.searchPlaceholder[lang]}
          className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-muted/50 border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          dir={isAr ? 'rtl' : 'ltr'}
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              if (view === 'search') setView('home');
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full bg-muted"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Quick action pills */}
      {view === 'home' && (
        <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-none pb-1">
          <QuickPill
            icon={Heart}
            label={T.favorites[lang]}
            onClick={() => setView('favorites')}
            color="#e53e3e"
          />
          <QuickPill
            icon={Clock}
            label={T.recent[lang]}
            onClick={() => setView('favorites')}
            color="#4299e1"
          />
          <QuickPill
            icon={Sparkles}
            label={T.smart[lang]}
            onClick={() => setView('smart')}
            color="#9b59b6"
          />
          <QuickPill
            icon={Filter}
            label={T.filters[lang]}
            onClick={() => setShowFilters(!showFilters)}
            color="#48bb78"
          />
        </div>
      )}
    </div>
  );

  // Render content based on view
  const renderContent = () => {
    switch (view) {
      case 'home':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
            {/* Stats banner */}
            <div className="flex items-center justify-between rounded-xl p-3 border border-emerald-500/20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Apple className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{T.title[lang]}</p>
                  <p className="text-sm font-bold text-foreground">
                    {TOTAL_FOOD_COUNT} {T.totalFoods[lang]}
                  </p>
                </div>
              </div>
              <Sparkles className="w-5 h-5 text-emerald-500/50" />
            </div>

            {/* Categories grid */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">{T.categories[lang]}</h3>
              <CategoryGrid lang={lang} onSelect={handleCategorySelect} />
            </div>

            {/* Smart suggestions */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">{T.smart[lang]}</h3>
              <div className="grid grid-cols-2 gap-2">
                {SMART_SECTIONS.map(({ key, label, icon: Icon, color }) => (
                  <button
                    key={key}
                    onClick={() => handleSmartSelect(key)}
                    className="flex items-center gap-2 p-3 rounded-xl bg-muted/40 border border-border/30 active:scale-95 transition-all hover:bg-muted/60"
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${color}15` }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color }} />
                    </div>
                    <span className="text-[11px] font-medium text-foreground leading-tight text-left">
                      {label[lang]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        );

      case 'category':
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            {selectedCategory && (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">{CATEGORY_INFO[selectedCategory]?.emoji}</span>
                  <h3 className="text-base font-bold text-foreground">
                    {CATEGORY_INFO[selectedCategory]?.label[lang]}
                  </h3>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {categoryFoods.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {categoryFoods.map((food) => (
                    <FoodCard
                      key={food.id}
                      food={food}
                      lang={lang}
                      onClick={() => handleFoodSelect(food)}
                    />
                  ))}
                </div>
              </>
            )}
          </motion.div>
        );

      case 'search':
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {searchResults.length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">{T.noResults[lang]}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground mb-2">
                  {searchResults.length} {T.totalFoods[lang]}
                </p>
                {searchResults.map((food) => (
                  <FoodCard
                    key={food.id}
                    food={food}
                    lang={lang}
                    onClick={() => handleFoodSelect(food)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        );

      case 'favorites': {
        const favFoods = getFavoriteFoods();
        const recentFoods = getRecentFoodItems();
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Heart className="w-4 h-4 text-red-500" /> {T.favorites[lang]}
              </h3>
              {favFoods.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  {T.noFavorites[lang]}
                </p>
              ) : (
                <div className="space-y-2">
                  {favFoods.map((food) => (
                    <FoodCard
                      key={food.id}
                      food={food}
                      lang={lang}
                      onClick={() => handleFoodSelect(food)}
                    />
                  ))}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" /> {T.recent[lang]}
              </h3>
              {recentFoods.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">{T.noRecent[lang]}</p>
              ) : (
                <div className="space-y-2">
                  {recentFoods.slice(0, 10).map((food) => (
                    <FoodCard
                      key={food.id}
                      food={food}
                      lang={lang}
                      onClick={() => handleFoodSelect(food)}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        );
      }

      case 'smart': {
        const section = SMART_SECTIONS.find((s) => s.key === smartSection);
        return (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            {section && (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${section.color}15` }}
                  >
                    <section.icon className="w-4 h-4" style={{ color: section.color }} />
                  </div>
                  <h3 className="text-base font-bold text-foreground">{section.label[lang]}</h3>
                  <span className="text-xs text-muted-foreground ml-auto">{smartFoods.length}</span>
                </div>
                <div className="space-y-2">
                  {smartFoods.map((food) => (
                    <FoodCard
                      key={food.id}
                      food={food}
                      lang={lang}
                      onClick={() => handleFoodSelect(food)}
                    />
                  ))}
                </div>
              </>
            )}
          </motion.div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="space-y-3 pb-20">
      {renderHeader()}

      <AnimatePresence mode="wait">
        {showFilters && (
          <SmartFilters
            lang={lang}
            activeTags={activeTags}
            onTagsChange={setActiveTags}
            onClose={() => setShowFilters(false)}
          />
        )}
      </AnimatePresence>

      {renderContent()}

      {/* Food detail sheet */}
      <AnimatePresence>
        {selectedFood && (
          <FoodDetailSheet food={selectedFood} lang={lang} onClose={() => setSelectedFood(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Quick Pill Button ─── */
function QuickPill({
  icon: Icon,
  label,
  onClick,
  color,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 border border-border/40 whitespace-nowrap active:scale-95 transition-all shrink-0"
    >
      <Icon className="w-3 h-3" style={{ color }} />
      <span className="text-[11px] font-medium text-foreground">{label}</span>
    </button>
  );
}
