import React, { useMemo, useState } from 'react';
import { Search, X, Check, Users } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { isEmojiAvatarValue, getAppleEmojiUrl } from '@/utils/emojiAvatar';
import { getDefaultAvatarForUser } from '@/utils/defaultAvatar';
import { useUserSearch, type UserSearchResult } from '@/lib/chat';

interface MemberPickerProps {
  isAr: boolean;
  /** Already-selected user ids (used to render checkmarks + drive `onChange`). */
  selectedIds: string[];
  /** User ids that should be hidden from results (e.g. existing members of a chat). */
  excludeIds?: string[];
  onChange: (next: string[]) => void;
  /** Resolution helper for avatar names — used to render selected pills above the search field. */
  resolveSelected?: (id: string) => UserSearchResult | null;
  placeholderAr?: string;
  /** Maximum members allowed in the pick. 0 = unlimited. */
  maxSelected?: number;
}

function renderAvatar(name: string | null | undefined, avatarUrl: string | null | undefined) {
  const isEmoji = avatarUrl ? isEmojiAvatarValue(avatarUrl) : false;
  const hasImage = avatarUrl && avatarUrl.startsWith('http');
  return (
    <Avatar className="h-9 w-9 shrink-0">
      {hasImage ? (
        <AvatarImage src={avatarUrl!} className="object-cover" />
      ) : isEmoji ? (
        <AvatarImage
          src={getAppleEmojiUrl(avatarUrl!) || ''}
          className="w-[60%] h-[60%] object-contain m-auto"
        />
      ) : (
        <img
          src={getDefaultAvatarForUser(name || '?')}
          alt=""
          className="w-full h-full object-cover"
        />
      )}
      <AvatarFallback className="bg-muted" />
    </Avatar>
  );
}

/**
 * Reusable username search + multi-select. Used by GroupCreatorSheet
 * (initial member selection) and the AddMemberSheet (post-creation
 * member additions).
 */
const MemberPicker: React.FC<MemberPickerProps> = ({
  isAr, selectedIds, excludeIds = [], onChange, resolveSelected,
  placeholderAr, maxSelected = 0,
}) => {
  const [query, setQuery] = useState('');
  const search = useUserSearch(query);

  const results = useMemo(() => {
    const exclude = new Set(excludeIds);
    return search.results.filter(r => !exclude.has(r.userId));
  }, [search.results, excludeIds]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggle = (userId: string) => {
    if (selectedSet.has(userId)) {
      onChange(selectedIds.filter(id => id !== userId));
    } else {
      if (maxSelected > 0 && selectedIds.length >= maxSelected) return;
      onChange([...selectedIds, userId]);
    }
  };

  return (
    <div className="flex flex-col gap-2 min-h-0 flex-1">
      {/* Selected pills above the search */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {selectedIds.map(id => {
            const r = resolveSelected?.(id);
            const label = r?.displayName || r?.username || id.slice(0, 6);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggle(id)}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 text-primary px-2 py-1 text-[12px] font-medium active:scale-95"
              >
                <span className="truncate max-w-[110px]">{label}</span>
                <X className="h-3 w-3 opacity-80" />
              </button>
            );
          })}
        </div>
      )}

      {/* Search input */}
      <div className="px-1">
        <div className="flex items-center bg-muted/30 rounded-full px-3 h-10">
          <Search className="w-4 h-4 text-muted-foreground/60 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={(placeholderAr ?? 'ابحث عن مستخدم...')}
            className="flex-1 bg-transparent text-[14px] outline-none ms-2 placeholder:text-muted-foreground/40"
            dir="auto"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="w-6 h-6 rounded-full flex items-center justify-center active:bg-accent/40"
              type="button"
              aria-label={'مسح'}
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto -mx-1">
        {query.trim().length < 2 && selectedIds.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground/60 gap-2 py-10">
            <Users className="w-9 h-9 opacity-30" />
            <p className="text-[13px] text-center px-6">
              {'اكتب اسم مستخدم لإضافته'}
            </p>
          </div>
        )}

        {search.isLoading && query.trim().length >= 2 && (
          <div className="space-y-1.5 py-2">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center gap-3 px-3 py-2">
                <div className="skeleton h-9 w-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3 w-24 rounded" />
                  <div className="skeleton h-2.5 w-16 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!search.isLoading && query.trim().length >= 2 && results.length === 0 && (
          <div className="text-center py-8 text-[13px] text-muted-foreground/60">
            {'لا نتائج'}
          </div>
        )}

        {results.length > 0 && (
          <div className="divide-y divide-border/10">
            {results.map(user => {
              const isSelected = selectedSet.has(user.userId);
              const limitReached = !isSelected && maxSelected > 0 && selectedIds.length >= maxSelected;
              return (
                <button
                  key={user.userId}
                  type="button"
                  onClick={() => toggle(user.userId)}
                  disabled={limitReached}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 text-start transition-colors',
                    isSelected ? 'bg-primary/[0.04]' : 'active:bg-accent/40',
                    limitReached && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  {renderAvatar(user.username, user.avatarUrl)}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-foreground truncate">
                      {user.displayName || user.username}
                    </p>
                    {user.displayName && user.displayName !== user.username && (
                      <p className="text-[11px] text-muted-foreground truncate">@{user.username}</p>
                    )}
                  </div>
                  <div
                    className={cn(
                      'h-6 w-6 rounded-full flex items-center justify-center shrink-0 transition-all',
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-transparent',
                    )}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberPicker;
