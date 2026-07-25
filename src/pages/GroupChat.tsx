import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Info, Users, MessageCircle,
  Loader2, Reply, Pencil, Trash2, EyeOff, Copy as CopyIcon, Smile,
} from '@/lib/icons';
import { cn } from '@/lib/utils';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/hooks/useAuth';
import SEO from '@/components/SEO';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { useSmartBack } from '@/hooks/useSmartBack';
import {
  useChats, useChatMembers, useChatMessages, useChatMutations, useChatReactions,
  useTypingIndicator, useDraft, useComposer, useChatScroll, useChatSettings,
  newClientId, isAdmin as roleIsAdmin,
  type ChatMessage, type ChatSummary,
} from '@/lib/chat';
import GroupAvatar from '@/components/chat/groups/GroupAvatar';
import GroupComposer from '@/components/chat/groups/GroupComposer';
import GroupMessageBubble from '@/components/chat/groups/GroupMessageBubble';
import GroupInfoSheet from '@/components/chat/groups/GroupInfoSheet';
import MemberListSheet from '@/components/chat/groups/MemberListSheet';
import { TypingDots } from '@/components/chat/MessageBubble';
import { formatDateSeparator } from '@/components/chat/chatUtils';
import { useAppleEmojiReady } from '@/components/chat/appleEmoji';
import { QUICK_EMOJIS } from '@/components/chat/constants';
import { toast } from 'sonner';

/**
 * Dedicated screen for group + channel chats. Built entirely on the new
 * data layer (`@/lib/chat`) with no dependency on the legacy useChat /
 * ChatDrawer god-files. Lives at `/chat/g/:chatId`.
 *
 * Layout (full-page, like the legacy /chat tab):
 *   ┌──────────────────────────────────────────┐
 *   │  ← [avatar] Title           [info] [⋮]   │  ← header
 *   ├──────────────────────────────────────────┤
 *   │  • date separator                        │
 *   │   ┌─sender─┐                              │
 *   │   │ bubble │   bubble (mine, right)       │  ← message list
 *   │   └────────┘                              │
 *   │   …                                       │
 *   │                              [↓ N new]    │
 *   ├──────────────────────────────────────────┤
 *   │  reply banner (optional)                  │
 *   │  [😀] [textarea]                  [Send] │  ← composer
 *   └──────────────────────────────────────────┘
 */
export default function GroupChatPage() {
  const params = useParams<{ chatId: string }>();
  const chatId = params.chatId ?? null;
  const { t } = useApp();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const goBack = useSmartBack('/chat/groups');

  // Trigger the Apple-emoji map preload + re-render on ready (see
  // ../components/chat/appleEmoji.tsx) so message bodies in this group
  // chat upgrade from native unicode emojis to iPhone artwork.
  const _appleEmojiReady = useAppleEmojiReady();

  const { settings } = useChatSettings();

  const { chats, isLoading: chatsLoading } = useChats();
  const chat = useMemo<ChatSummary | undefined>(
    () => chats.find(c => c.id === chatId),
    [chats, chatId],
  );

  const { members } = useChatMembers(chatId);
  const memberMap = useMemo(() => {
    const m = new Map(members.map(member => [member.userId, member]));
    return m;
  }, [members]);

  const messagesQ = useChatMessages(chatId);
  const reactionsQ = useChatReactions(chatId);
  const muts = useChatMutations(chatId);

  const typing = useTypingIndicator(chatId, user?.id);
  const draft  = useDraft(chatId, chat?.myDraftText);

  const composer = useComposer({
    resetKey: chatId,
    initialText: draft.draft,
    onTextChange: draft.setDraft,
  });

  const scrollState = useChatScroll(
    chatId, messagesQ.messages, user?.id, chat?.myLastReadAt,
  );

  // Long-press action menu state
  const [actionMenu, setActionMenu] = useState<{ msg: ChatMessage; rect: DOMRect } | null>(null);

  // Other sheets
  const [showInfo, setShowInfo] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  // Mark read on enter + when new messages arrive while at the bottom
  useEffect(() => {
    if (!chatId || !chat) return;
    const last = messagesQ.messages[messagesQ.messages.length - 1];
    if (!last) return;
    if (chat.unreadCount > 0 || (chat.myLastReadAt && Date.parse(last.createdAt) > Date.parse(chat.myLastReadAt))) {
      void muts.markRead(chatId, last.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, messagesQ.messages.length]);

  // Restore scroll on first paint of a chat. Use a microtask so the list has
  // measured its content already.
  const restoredRef = useRef<string | null>(null);
  useEffect(() => {
    if (!chatId || messagesQ.messages.length === 0) return;
    if (restoredRef.current === chatId) return;
    restoredRef.current = chatId;
    requestAnimationFrame(() => scrollState.restoreScroll());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, messagesQ.messages.length === 0]);

  const onSend = useCallback(async () => {
    const text = composer.text.trim();
    if (!chatId || !user) return;
    if (composer.editing) {
      // Edit path
      await muts.editMessage(composer.editing.id, text);
      composer.cancelEdit();
      draft.clearDraft();
      typing.clearTyping();
      return;
    }
    if (!text) return;
    composer.setText('');
    draft.clearDraft();
    typing.clearTyping();
    // Self-destruct: if the chat has a default, stamp expires_at.
    const expiresAt = chat?.selfDestructSeconds
      ? new Date(Date.now() + chat.selfDestructSeconds * 1000).toISOString()
      : null;
    await muts.sendMessage({
      chatId,
      kind: 'text',
      content: text,
      replyToId: composer.replyTo?.id ?? null,
      expiresAt,
      clientId: newClientId(),
    });
    composer.setReplyTo(null);
  }, [chatId, user, composer, muts, draft, typing, chat?.selfDestructSeconds]);

  const onRetry = useCallback((msg: ChatMessage) => {
    void muts.retryFailedMessage(msg);
  }, [muts]);

  const onToggleReaction = useCallback((messageId: string, emoji: string) => {
    if (!user) return;
    void muts.toggleReaction(messageId, emoji, user.id);
  }, [muts, user]);

  // ── Loading / error states ────────────────────────────────────────────────
  if (authLoading || (chatsLoading && !chat)) {
    return <GroupChatSkeleton />;
  }
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4">
        <h1 className="text-xl font-bold">{'سجّل الدخول للوصول'}</h1>
        <Button onClick={() => navigate('/auth')}>{t('auth.signIn')}</Button>
      </div>
    );
  }
  if (!chat) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-3">
        <MessageCircle className="w-12 h-12 text-muted-foreground/40" />
        <h1 className="text-lg font-semibold">{'المحادثة غير موجودة'}</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          {'ربما تم حذفها أو لم تعد عضواً فيها.'}
        </p>
        <Button onClick={goBack} variant="outline">{'رجوع'}</Button>
      </div>
    );
  }

  // ── Compose date-separator + grouped bubbles ──────────────────────────────
  const renderItems = (() => {
    type Item =
      | { kind: 'date'; key: string; label: string }
      | { kind: 'msg';  key: string; msg: ChatMessage; showSender: boolean };
    const out: Item[] = [];
    let prev: ChatMessage | null = null;
    for (const m of messagesQ.messages) {
      const same = prev
        && new Date(prev.createdAt).toDateString() === new Date(m.createdAt).toDateString();
      if (!same) {
        out.push({ kind: 'date', key: `d-${m.id}`, label: formatDateSeparator(m.createdAt) });
      }
      const showSender =
        m.senderId !== user.id
        && (
          !prev
          || prev.senderId !== m.senderId
          || (Date.parse(m.createdAt) - Date.parse(prev.createdAt)) > 5 * 60_000
          || !same
        );
      out.push({ kind: 'msg', key: m.id, msg: m, showSender });
      prev = m;
    }
    return out;
  })();

  const channelReadOnly = chat.kind === 'channel'
    && chat.whoCanSend === 'admins'
    && !roleIsAdmin({ role: chat.myRole });
  const groupRestrictedRead = chat.kind === 'group'
    && chat.whoCanSend === 'admins'
    && !roleIsAdmin({ role: chat.myRole });

  return (
    <ErrorBoundary fallbackTitle={'حدث خطأ'}>
      <SEO
        title={`${chat.title ?? ('محادثة')} — SmartHub`}
        description={chat.description ?? ''}
        path={`/chat/g/${chatId}`}
      />
      <div
        className="flex flex-col bg-background w-full relative"
        style={{
          height: '100dvh',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="h-14 border-b border-border/15 px-3 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={goBack}
            className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40"
            aria-label={'رجوع'}
          >
            {<ArrowRight className="w-5 h-5" />}
          </button>
          <button
            type="button"
            onClick={() => setShowInfo(true)}
            className="flex items-center gap-2.5 flex-1 min-w-0 active:opacity-80 text-start"
          >
            <GroupAvatar chat={chat} className="h-9 w-9" />
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold truncate">{chat.title || ('بدون اسم')}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {typing.anyOtherTyping ? (
                  <span className="inline-flex items-center gap-1 text-primary">
                    <TypingDots size={3} />
                    {typing.othersTyping.length > 1
                      ? ('يكتبون')
                      : ('يكتب')}
                  </span>
                ) : (
                  <>
                    {chat.kind === 'channel'
                      ? ('قناة')
                      : ('مجموعة')}
                    {' · '}
                    {`${chat.memberCount} ${chat.memberCount === 1 ? 'عضو' : 'أعضاء'}`}
                  </>
                )}
              </p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setShowMembers(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40"
            aria-label={'الأعضاء'}
          >
            <Users className="w-4.5 h-4.5 text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={() => setShowInfo(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center active:bg-accent/40"
            aria-label={'معلومات'}
          >
            <Info className="w-4.5 h-4.5 text-muted-foreground" />
          </button>
        </header>

        {/* ── Message list ─────────────────────────────────────────────── */}
        <div
          ref={scrollState.containerRef}
          onScroll={scrollState.onScroll}
          className={cn(
            'flex-1 min-h-0 overflow-y-auto px-3 py-3',
            settings.appearance.density === 'compact'    && 'space-y-1',
            settings.appearance.density === 'comfortable' && 'space-y-1.5',
            settings.appearance.density === 'cozy'       && 'space-y-2.5',
          )}
        >
          {/* Top sentinel: load older */}
          {messagesQ.hasMoreOlder && (
            <div className="flex justify-center py-2">
              <button
                type="button"
                onClick={() => void messagesQ.loadOlder()}
                disabled={messagesQ.isFetchingOlder}
                className="text-[11px] font-medium px-3 h-8 rounded-full bg-muted/30 text-muted-foreground active:bg-muted/50 inline-flex items-center gap-1.5 disabled:opacity-60"
              >
                {messagesQ.isFetchingOlder
                  ? <Loader2 className="w-3 h-3 animate-spin" />
                  : null}
                {'تحميل أقدم'}
              </button>
            </div>
          )}

          {messagesQ.messages.length === 0 && !messagesQ.isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground/60 gap-3 py-12">
              <MessageCircle className="w-10 h-10 opacity-30" />
              <p className="text-[13px]">
                {'لا رسائل بعد. ابدأ المحادثة.'}
              </p>
            </div>
          )}

          {renderItems.map(item => {
            if (item.kind === 'date') {
              return (
                <div key={item.key} className="flex justify-center py-2">
                  <span className="text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-muted/30 text-muted-foreground/80">
                    {item.label}
                  </span>
                </div>
              );
            }
            const m = item.msg;
            const sender = memberMap.get(m.senderId) ?? null;
            const replyTarget = m.replyToId
              ? messagesQ.messages.find(x => x.id === m.replyToId) ?? null
              : null;
            return (
              <GroupMessageBubble
                key={item.key}
                message={m}
                isMine={m.senderId === user.id}
                showSenderHeader={item.showSender && settings.appearance.showAvatars}
                sender={sender}
                reactions={reactionsQ.byMessage.get(m.id) ?? []}
                myUserId={user.id}
                replyTarget={replyTarget}
                onLongPress={(msg, target) => setActionMenu({ msg, rect: target.getBoundingClientRect() })}
                onToggleReaction={onToggleReaction}
                onJumpToReply={(id) => {
                  const el = document.getElementById(`msg-${id}`);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                onRetry={() => onRetry(m)}
              />
            );
          })}
          <div ref={scrollState.endRef} />
        </div>

        {/* ── Scroll-down pill ────────────────────────────────────────── */}
        <AnimatePresence>
          {scrollState.showScrollDown && (
            <motion.button
              type="button"
              onClick={() => scrollState.scrollToBottom(true)}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 18, stiffness: 320 }}
              className="absolute bottom-24 end-4 w-11 h-11 rounded-full bg-card border border-border/30 flex items-center justify-center z-raised"
              aria-label={'انتقل إلى الأسفل'}
            >
              <ArrowLeft className="w-4 h-4 text-foreground rotate-90" />
              {(chat.unreadCount ?? 0) > 0 && (
                <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
                  {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                </span>
              )}
            </motion.button>
          )}
        </AnimatePresence>

        {/* ── Composer ───────────────────────────────────────────────── */}
        <GroupComposer
          text={composer.text}
          onTextChange={composer.setText}
          onSend={onSend}
          isSending={muts.isPending.send}
          enterToSend={settings.behavior.enterToSend}
          replyTo={composer.replyTo}
          onClearReply={() => composer.setReplyTo(null)}
          editing={composer.editing}
          onCancelEdit={composer.cancelEdit}
          onTyping={typing.notifyTyping}
          readOnly={channelReadOnly || groupRestrictedRead}
          readOnlyReason={
            channelReadOnly
              ? ('هذه قناة — يمكن للمشرفين فقط النشر')
              : groupRestrictedRead
                ? ('الإرسال محصور بالمشرفين')
                : undefined
          }
        />

        {/* ── Action menu (long-press) ───────────────────────────────── */}
        <ActionMenuOverlay
          state={actionMenu}
          onClose={() => setActionMenu(null)}
          isMine={(m) => m.senderId === user.id}
          onReply={(m)   => { composer.setReplyTo(m); composer.cancelEdit(); }}
          onEdit={(m)    => composer.beginEdit(m)}
          onCopy={(m)    => {
            void navigator.clipboard.writeText(m.content || '').catch(() => undefined);
            toast.success('تم النسخ');
          }}
          onDelete={(m)  => void muts.deleteForEveryone(m.id)}
          onHide={(m)    => void muts.hideForSelf(m.id)}
          onReact={(m, emoji) => onToggleReaction(m.id, emoji)}
        />

        {/* ── Sheets ─────────────────────────────────────────────────── */}
        <GroupInfoSheet
          isOpen={showInfo}
          chat={chat}
          onClose={() => setShowInfo(false)}
          onOpenMembers={() => { setShowInfo(false); setShowMembers(true); }}
          onLeft={() => { setShowInfo(false); navigate('/chat/groups'); }}
          onDeleted={() => {
            // Owner-only delete — handled with a confirm in a follow-up wave;
            // for now we just hide the sheet.
            setShowInfo(false);
          }}
          myUserId={user.id}
        />
        <MemberListSheet
          isOpen={showMembers}
          chat={chat}
          onClose={() => setShowMembers(false)}
          myUserId={user.id}
        />
      </div>
    </ErrorBoundary>
  );
}

// ── Action menu (long-press popover) ────────────────────────────────────────

interface ActionMenuOverlayProps {
  state: { msg: ChatMessage; rect: DOMRect } | null;
  onClose: () => void;
  isMine: (m: ChatMessage) => boolean;
  onReply: (m: ChatMessage) => void;
  onEdit:  (m: ChatMessage) => void;
  onCopy:  (m: ChatMessage) => void;
  onDelete:(m: ChatMessage) => void;
  onHide:  (m: ChatMessage) => void;
  onReact: (m: ChatMessage, emoji: string) => void;
}

function ActionMenuOverlay({ state, onClose, isMine, onReply, onEdit, onCopy, onDelete, onHide, onReact,
}: ActionMenuOverlayProps) {
  if (!state) return null;
  const { msg } = state;
  const mine = isMine(msg);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 z-sheet bg-black/60"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="absolute inset-x-4 bottom-24 z-sheet-above flex flex-col items-stretch gap-2"
        onClick={e => e.stopPropagation()}
      >
        {/* Quick reactions row */}
        <div className="flex items-center justify-around bg-card border border-border/30 rounded-full px-2 py-1 ">
          {QUICK_EMOJIS.map(emoji => (
            <button
              key={emoji}
              type="button"
              onClick={() => { onReact(msg, emoji); onClose(); }}
              className="text-[22px] w-10 h-10 rounded-full active:scale-90 transition-transform"
            >
              {emoji}
            </button>
          ))}
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center active:bg-accent/40 text-muted-foreground"
            aria-label={'إغلاق'}
          >
            <Smile className="w-4 h-4" />
          </button>
        </div>

        {/* Action list */}
        <div className="bg-popover border border-border/30 rounded-2xl py-1 overflow-hidden">
          <ActionRow
            icon={<Reply className="w-4 h-4" />}
            label={'رد'}
            onClick={() => { onReply(msg); onClose(); }}
          />
          <ActionRow
            icon={<CopyIcon className="w-4 h-4" />}
            label={'نسخ النص'}
            onClick={() => { onCopy(msg); onClose(); }}
            disabled={!msg.content}
          />
          {mine && !msg.deleted && (
            <ActionRow
              icon={<Pencil className="w-4 h-4" />}
              label={'تعديل'}
              onClick={() => { onEdit(msg); onClose(); }}
            />
          )}
          {mine && !msg.deleted && (
            <ActionRow
              icon={<Trash2 className="w-4 h-4 text-destructive" />}
              label={'حذف للجميع'}
              onClick={() => { onDelete(msg); onClose(); }}
              danger
            />
          )}
          <ActionRow
            icon={<EyeOff className="w-4 h-4" />}
            label={'إخفاء عنّي'}
            onClick={() => { onHide(msg); onClose(); }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

interface ActionRowProps { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; danger?: boolean }
function ActionRow({ icon, label, onClick, disabled, danger }: ActionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-3 px-4 h-11 text-start text-[14px] active:bg-accent/40 transition-colors',
        danger ? 'text-destructive' : 'text-foreground',
        disabled && 'opacity-50',
      )}
    >
      <span className="shrink-0">{icon}</span>{label}
    </button>
  );
}

function GroupChatSkeleton() {
  return (
    <div
      className="flex flex-col bg-background w-full"
      style={{ height: '100dvh' }}
    >
      <div className="h-14 border-b border-border/15 px-3 flex items-center gap-3">
        <div className="skeleton h-9 w-9 rounded-full" />
        <div className="skeleton h-9 w-9 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <div className="skeleton h-3.5 w-32 rounded" />
          <div className="skeleton h-2.5 w-20 rounded" />
        </div>
      </div>
      <div className="flex-1 px-3 py-3 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={cn('flex', i % 2 === 0 ? 'justify-start' : 'justify-end')}
          >
            <div
              className={cn(
                'skeleton rounded-2xl',
                i % 2 === 0 ? 'h-10 w-44' : 'h-10 w-32',
              )}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
