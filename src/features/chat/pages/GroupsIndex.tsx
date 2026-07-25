import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Plus, Users, Hash, Search, X,
} from '@/lib/icons';
import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import SEO from '@/components/SEO';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { useSmartBack } from '@/hooks/useSmartBack';
import { useChats, isGroup, isChannel, isChatPinned, type ChatSummary } from '@/lib/chat';
import GroupAvatar from '@/features/chat/components/groups/GroupAvatar';
import GroupCreatorSheet from '@/features/chat/components/groups/GroupCreatorSheet';
import { formatTime } from '@/features/chat/components/chatUtils';

/**
 * /chat/groups — index of every group + channel the user belongs to.
 *
 * Design notes:
 *   • This screen is intentionally separate from the legacy /chat tab so we
 *     can ship the new model without risking regressions in the 1-to-1
 *     surface. Users get to it via the FAB → "New group/channel" flow or
 *     via the "Groups & Channels" entry point in /chat.
 *   • Tabs split the list into "All", "Groups", "Channels" — channels and
 *     groups have very different mental models (broadcast vs.
 *     conversation) and lumping them together hurts scannability past
 *     ~10 chats.
 */
export default function GroupsIndexPage() {
  const { t } = useApp();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const goBack = useSmartBack('/chat');

  const { chats, isLoading } = useChats();
  const [filter, setFilter] = useState<'all' | 'groups' | 'channels'>('all');
  const [query, setQuery] = useState('');
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [creatorKind, setCreatorKind] = useState<'group' | 'channel'>('group');
  const [showCreatorMenu, setShowCreatorMenu] = useState(false);

  const groupChats = useMemo(() => chats.filter(c => c.kind !== 'dm'), [chats]);

  const filtered = useMemo(() => {
    let out = groupChats;
    if (filter === 'groups')   out = out.filter(c => isGroup(c));
    if (filter === 'channels') out = out.filter(c => isChannel(c));
    if (query.trim()) {
      const q = query.toLowerCase();
      out = out.filter(c =>
        (c.title ?? '').toLowerCase().includes(q)
        || (c.description ?? '').toLowerCase().includes(q),
      );
    }
    // Pinned first, then most-recently-updated.
    return [...out].sort((a, b) => {
      const ap = isChatPinned(a) ? 1 : 0;
      const bp = isChatPinned(b) ? 1 : 0;
      if (ap !== bp) return bp - ap;
      return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
    });
  }, [groupChats, filter, query]);

  if (authLoading) {
    return <Skeleton />;
  }
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4">
        <h1 className="text-xl font-bold">
          {'سجّل الدخول للوصول'}
        </h1>
        <Button onClick={() => navigate('/auth')}>{t('auth.signIn')}</Button>
      </div>
    );
  }

  return (
    <ErrorBoundary fallbackTitle={'حدث خطأ'}>
      <SEO
        title={'المجموعات والقنوات — SmartHub'}
        description={'إدارة المجموعات والقنوات.'}
        path="/chat/groups"
      />
      <div
        className="flex flex-col bg-background w-full relative"
        style={{
          height: '100dvh',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 64px)',
        }}
      >
        {/* Header */}
        <header className="h-14 border-b border-border/15 px-3 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={goBack}
            className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40"
            aria-label={'رجوع'}
          >
            {<ArrowRight className="w-5 h-5" />}
          </button>
          <h1 className="flex-1 text-[16px] font-semibold truncate">
            {'المجموعات والقنوات'}
          </h1>
        </header>

        {/* Search */}
        <div className="px-4 pt-3 pb-2 shrink-0">
          <div className="flex items-center bg-muted/30 rounded-full px-3 h-10">
            <Search className="w-4 h-4 text-muted-foreground/60 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={'ابحث في المجموعات...'}
              className="flex-1 bg-transparent text-[14px] outline-none ms-2 placeholder:text-muted-foreground/40"
              dir="auto"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="w-6 h-6 rounded-full flex items-center justify-center active:bg-accent/40"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1.5 px-4 pt-1 pb-2 overflow-x-auto scrollbar-none shrink-0">
          {([
            { id: 'all',      ar: 'الكل',     count: groupChats.length },
            { id: 'groups',   ar: 'مجموعات',   count: groupChats.filter(c => isGroup(c)).length },
            { id: 'channels', ar: 'قنوات',    count: groupChats.filter(c => isChannel(c)).length },
          ] as const).map(tab => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={cn(
                  'h-8 px-3.5 rounded-full text-[12px] font-medium transition-all whitespace-nowrap inline-flex items-center gap-1.5',
                  active
                    ? 'bg-primary text-primary-foreground '
                    : 'bg-muted/30 text-muted-foreground active:bg-muted/50',
                )}
              >
                {tab.ar}
                {tab.count > 0 && (
                  <span className={cn(
                    'text-[10px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1',
                    active ? 'bg-primary-foreground/20' : 'bg-muted/50',
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && groupChats.length === 0 ? (
            <div className="divide-y divide-border/10">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="skeleton h-12 w-12 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-3.5 w-28 rounded" />
                    <div className="skeleton h-3 w-44 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              filter={filter}
              hasAny={groupChats.length > 0}
              onNewGroup={() => { setCreatorKind('group'); setCreatorOpen(true); }}
              onNewChannel={() => { setCreatorKind('channel'); setCreatorOpen(true); }}
            />
          ) : (
            <div className="divide-y divide-border/10">
              {filtered.map(c => (
                <GroupRow
                  key={c.id}
                  chat={c}
                  onClick={() => navigate(`/chat/g/${c.id}`)}
                />
              ))}
            </div>
          )}
        </div>

        {/* FAB + creator menu */}
        <div className="absolute bottom-24 end-5 z-raised flex flex-col items-end gap-2">
          <AnimatePresence>
            {showCreatorMenu && (
              <>
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 z-scrim bg-black/15"
                  onClick={() => setShowCreatorMenu(false)}
                />
                <motion.button
                  type="button"
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  transition={{ type: 'spring', damping: 22, stiffness: 320, delay: 0.05 }}
                  onClick={() => { setShowCreatorMenu(false); setCreatorKind('channel'); setCreatorOpen(true); }}
                  className="z-raised inline-flex items-center gap-2.5 rounded-full bg-card border border-border/30 px-3.5 h-10 active:scale-95"
                >
                  <Hash className="w-4 h-4 text-primary" />
                  <span className="text-[13px] font-semibold">{'قناة جديدة'}</span>
                </motion.button>
                <motion.button
                  type="button"
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  transition={{ type: 'spring', damping: 22, stiffness: 320 }}
                  onClick={() => { setShowCreatorMenu(false); setCreatorKind('group'); setCreatorOpen(true); }}
                  className="z-raised inline-flex items-center gap-2.5 rounded-full bg-card border border-border/30 px-3.5 h-10 active:scale-95"
                >
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-[13px] font-semibold">{'مجموعة جديدة'}</span>
                </motion.button>
              </>
            )}
          </AnimatePresence>
          <button
            type="button"
            onClick={() => setShowCreatorMenu(s => !s)}
            className="z-raised w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-90 transition-transform"
            aria-label={'إنشاء جديد'}
          >
            <motion.span
              animate={{ rotate: showCreatorMenu ? 45 : 0 }}
              transition={{ type: 'spring', damping: 18, stiffness: 320 }}
            >
              <Plus className="w-5 h-5" />
            </motion.span>
          </button>
        </div>

        {/* Creator sheet */}
        <GroupCreatorSheet
          isOpen={creatorOpen}
          onClose={() => setCreatorOpen(false)}
          onCreated={(chat) => {
            setCreatorOpen(false);
            navigate(`/chat/g/${chat.id}`);
          }}
          initialKind={creatorKind}
        />
      </div>
    </ErrorBoundary>
  );
}

interface GroupRowProps { chat: ChatSummary; onClick: () => void }
function GroupRow({ chat, onClick }: GroupRowProps) {
  const lastTime = chat.lastMessage?.at ?? chat.updatedAt;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 transition-colors text-start active:bg-accent/40',
        chat.unreadCount > 0 && 'bg-primary/[0.02]',
      )}
    >
      <GroupAvatar chat={chat} className="h-[52px] w-[52px]" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            'text-[15px] text-foreground truncate',
            chat.unreadCount > 0 ? 'font-bold' : 'font-semibold',
          )}>
            {chat.title || ('بدون اسم')}
          </span>
          <span className={cn(
            'text-[11px] shrink-0 tabular-nums',
            chat.unreadCount > 0 ? 'text-primary font-semibold' : 'text-muted-foreground/50',
          )}>
            {formatTime(lastTime)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={cn(
            'text-[13px] truncate leading-relaxed',
            chat.unreadCount > 0 ? 'text-foreground/75 font-medium' : 'text-muted-foreground/65',
          )} dir="auto">
            {chat.lastMessage
              ? (chat.lastMessage.deleted
                  ? ('🚫 محذوفة')
                  : chat.lastMessage.preview)
              : (
                <span className="italic text-muted-foreground/40">
                  {'لا توجد رسائل بعد'}
                </span>
              )}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            {chat.unreadCount > 0 && (
              <span className="text-[11px] rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1.5 font-bold bg-primary text-primary-foreground">
                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

interface EmptyStateProps {
  filter: 'all' | 'groups' | 'channels';
  hasAny: boolean;
  onNewGroup: () => void;
  onNewChannel: () => void;
}

function EmptyState({ filter, hasAny, onNewGroup, onNewChannel }: EmptyStateProps) {
  if (hasAny) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 px-8 py-16">
        <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center">
          {filter === 'channels'
            ? <Hash  className="h-9 w-9 text-primary/30" />
            : <Users className="h-9 w-9 text-primary/30" />}
        </div>
        <p className="text-[14px] font-semibold text-foreground/60 text-center">
          {'لا نتائج تطابق التصفية'}
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 px-8 py-12">
      <div className="w-24 h-24 rounded-full bg-primary/5 flex items-center justify-center">
        <Users className="h-11 w-11 text-primary/30" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-[15px] font-semibold text-foreground/70">
          {'لا توجد مجموعات بعد'}
        </p>
        <p className="text-[13px] text-muted-foreground/60 max-w-xs leading-relaxed">
          {'أنشئ مجموعة لمحادثة عدة أصدقاء معاً، أو قناةً لبثّ التحديثات.'}
        </p>
      </div>
      <div className="flex gap-2 w-full max-w-xs">
        <Button
          onClick={onNewGroup}
          className="flex-1 rounded-full"
        >
          <Users className="w-4 h-4 me-1.5" />
          {'مجموعة'}
        </Button>
        <Button
          onClick={onNewChannel}
          variant="outline"
          className="flex-1 rounded-full"
        >
          <Hash className="w-4 h-4 me-1.5" />
          {'قناة'}
        </Button>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="min-h-screen p-4 space-y-3">
      <div className="skeleton h-14 w-full rounded-2xl" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="skeleton h-12 w-12 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="skeleton h-3.5 w-28 rounded" />
            <div className="skeleton h-3 w-2/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
