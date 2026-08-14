import React, { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { AppCard } from '@/components/ui/app-shell';
import { Loader2, MessageSquareText, Plus, Send } from '@/lib/icons';

import { marginaliaApi } from '../api';
import type { MgArticle, MgConversation, MgMessage } from '../types';

interface Props {
  articles: Map<string, MgArticle>;
  /** A connection the user chose to "discuss" — seeds a fresh conversation. */
  seed?: { connectionId: string; text: string } | null;
  onSeedConsumed?: () => void;
}

/**
 * RAG chat over the archive. Answers stream in token-by-token; the server
 * persists both turns, so a reload restores the thread verbatim.
 */
const ChatPanel: React.FC<Props> = ({ articles, seed, onSeedConsumed }) => {
  const [conversations, setConversations] = useState<MgConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MgMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState('');
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      const list = await marginaliaApi.listConversations();
      setConversations(list);
      setActiveId((cur) => cur ?? list[0]?.id ?? null);
    } catch (e) { toast.error((e as Error).message); }
  }, []);

  useEffect(() => { void loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    let alive = true;
    marginaliaApi.listMessages(activeId)
      .then((m) => { if (alive) setMessages(m); })
      .catch((e) => toast.error((e as Error).message));
    return () => { alive = false; };
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, streaming]);

  const send = useCallback(async (text: string, conversationId: string) => {
    setBusy(true);
    setStreaming('');
    const optimistic: MgMessage = {
      id: `local_${Date.now()}`, conversation_id: conversationId, role: 'user',
      content: text, model_used: null, cited_article_ids: [], created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await marginaliaApi.streamChat(
        conversationId, text, (delta) => setStreaming((s) => s + delta), controller.signal,
      );
      setMessages((prev) => [...prev, {
        id: `local_a_${Date.now()}`, conversation_id: conversationId, role: 'assistant',
        content: result.text, model_used: result.model ?? null,
        cited_article_ids: result.citedArticleIds, created_at: new Date().toISOString(),
      }]);
      void loadConversations();
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast.error((e as Error).message);
    } finally {
      setStreaming('');
      setBusy(false);
      abortRef.current = null;
    }
  }, [loadConversations]);

  // A "discuss this connection" click opens a new thread pre-seeded with
  // the connection text as the opening question.
  useEffect(() => {
    if (!seed) return;
    let alive = true;
    (async () => {
      try {
        const convo = await marginaliaApi.createConversation(seed.connectionId, 'نقاش رابط');
        if (!alive) return;
        setConversations((prev) => [convo, ...prev]);
        setActiveId(convo.id);
        setMessages([]);
        await send(`ناقش هذا الرابط بين مقالين من أرشيفي وحدّد ما يصحّ منه وما يحتاج تحفّظاً:\n\n${seed.text}`, convo.id);
      } catch (e) { toast.error((e as Error).message); }
      finally { onSeedConsumed?.(); }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per seed
  }, [seed]);

  const submit = async () => {
    const text = input.trim();
    if (!text || busy) return;
    let convoId = activeId;
    if (!convoId) {
      try {
        const convo = await marginaliaApi.createConversation();
        setConversations((prev) => [convo, ...prev]);
        setActiveId(convo.id);
        convoId = convo.id;
      } catch (e) { toast.error((e as Error).message); return; }
    }
    setInput('');
    await send(text, convoId);
  };

  const newThread = async () => {
    try {
      const convo = await marginaliaApi.createConversation();
      setConversations((prev) => [convo, ...prev]);
      setActiveId(convo.id);
      setMessages([]);
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none" dir="rtl">
        <button
          type="button"
          onClick={newThread}
          className="shrink-0 flex items-center gap-1 text-[0.6875rem] font-bold px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary active:scale-95 transition"
        >
          <Plus className="w-3.5 h-3.5" /> نقاش جديد
        </button>
        {conversations.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActiveId(c.id)}
            className={`shrink-0 max-w-[9rem] truncate text-[0.6875rem] font-bold px-2.5 py-1.5 rounded-lg transition ${
              activeId === c.id ? 'bg-background text-foreground shadow-sm' : 'bg-muted/50 text-muted-foreground'
            }`}
          >
            {c.title || 'بلا عنوان'}
          </button>
        ))}
      </div>

      <div className="space-y-2 min-h-[8rem]">
        {messages.length === 0 && !streaming && (
          <AppCard className="text-center py-8 space-y-2">
            <MessageSquareText className="w-8 h-8 mx-auto text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              اسأل أرشيفك: «ما الذي قرأته عن الحوافز؟» — الجواب يستند إلى مقالاتك فقط.
            </p>
          </AppCard>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
              m.role === 'user'
                ? 'bg-primary/10 text-foreground ms-8'
                : 'bg-card border border-border/40 text-foreground me-2'
            }`}
          >
            {m.content}
            {m.role === 'assistant' && m.cited_article_ids.length > 0 && (
              <div className="mt-2 pt-2 border-t border-border/40 space-y-1">
                {m.cited_article_ids.map((id, i) => {
                  const a = articles.get(id);
                  if (!a) return null;
                  return (
                    <a key={id} href={a.url} target="_blank" rel="noopener noreferrer"
                      className="block text-[0.6875rem] text-muted-foreground hover:text-foreground transition truncate">
                      [{i + 1}] {a.title || a.url}
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        ))}
        {streaming && (
          <div className="rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line bg-card border border-border/40 me-2">
            {streaming}
            <span className="inline-block w-1.5 h-4 align-middle bg-primary/70 animate-pulse ms-0.5" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-end gap-2 sticky bottom-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submit(); }
          }}
          rows={1}
          placeholder="اسأل أرشيفك…"
          className="flex-1 text-base rounded-2xl bg-muted/40 border border-border/40 px-3.5 py-2.5 resize-none max-h-32 focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="button"
          onClick={submit}
          disabled={busy || !input.trim()}
          aria-label="إرسال"
          className="shrink-0 p-3 rounded-2xl bg-primary text-primary-foreground active:scale-95 transition disabled:opacity-40"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

export default ChatPanel;
