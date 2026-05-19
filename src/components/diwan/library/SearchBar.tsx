import React, { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';

interface Props {
  value?: string;
  placeholder?: string;
  onChange: (value: string) => void;
  debounceMs?: number;
  autoFocus?: boolean;
}

/**
 * بحث مع debouncing — يظهر فورًا في الإدخال، يطلق onChange بعد توقّف
 * المستخدم عن الكتابة. يحافظ على عربية النصّ بـ amiri فقط للنتائج.
 */
export default function SearchBar({
  value,
  placeholder = 'ابحث في المكتبة…',
  onChange,
  debounceMs = 250,
  autoFocus,
}: Props) {
  const [local, setLocal] = useState<string>(value ?? '');

  // sync external value into local input (e.g. when filter is reset)
  useEffect(() => { if (value !== undefined && value !== local) setLocal(value); /* eslint-disable-next-line */ }, [value]);

  // debounce push
  useEffect(() => {
    const t = setTimeout(() => onChange(local), debounceMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  return (
    <div className="relative">
      <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground pointer-events-none" />
      <input
        type="search"
        autoFocus={autoFocus}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="w-full ps-10 pe-10 py-3 rounded-2xl bg-card border border-border/40 text-[14px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition"
      />
      {local && (
        <button
          onClick={() => setLocal('')}
          className="absolute top-1/2 -translate-y-1/2 end-2.5 w-7 h-7 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center"
          aria-label="مسح البحث"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
