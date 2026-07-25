import { useEffect, useMemo, useState } from 'react';

import { type LocalNote,pkmDb } from '@/features/pkm/lib/db';
import { extractWikiLinks, normalizeTitle } from '@/features/pkm/lib/wikiLinks';
import { supabase } from '@/integrations/supabase/client';

import { fullnessLevel, noteMass, vitality } from '../lib/growth';
import type { Hemisphere } from './useMemoryAnchor';

export interface MindNote {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  hemisphere: Hemisphere;
  wordCount: number;
  backlinkCount: number;
}

export interface MindEvent {
  id: string;
  type: 'insight' | 'contradiction';
  relatedNoteIds: string[];
  summary: string;
  createdAt: number;
}

export interface MindState {
  loading: boolean;
  firstNoteAt: number | null;
  fullness: number;
  vitalityOrganic: number;
  vitalityMechanical: number;
  massOrganic: number;
  massMechanical: number;
  organicNoteIds: string[];
  mechanicalNoteIds: string[];
  notes: MindNote[];      // sorted newest → oldest
  events: MindEvent[];    // sorted newest → oldest
}

const EMPTY: MindState = {
  loading: true,
  firstNoteAt: null,
  fullness: 0,
  vitalityOrganic: 0,
  vitalityMechanical: 0,
  massOrganic: 0,
  massMechanical: 0,
  organicNoteIds: [],
  mechanicalNoteIds: [],
  notes: [],
  events: [],
};

function countWords(md: string): number {
  if (!md) return 0;
  const clean = md.replace(/```[\s\S]*?```/g, ' ').replace(/[#*_>`[\]()~-]/g, ' ');
  return clean.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Compose the mind state from local Dexie notes + the pkm_mind_events
 * cloud table + (optional) accepted AI generations from pkm_ai_generations.
 *
 * Fully client-side derivation — matches the local-first architecture.
 */
export function useMindState(): MindState {
  const [notes, setNotes] = useState<LocalNote[]>([]);
  const [aiAcceptedIds, setAiAcceptedIds] = useState<Set<string>>(new Set());
  const [events, setEvents] = useState<MindEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function reload() {
      const rows = await pkmDb.notes.orderBy('updatedAt').reverse().toArray();
      if (cancelled) return;
      const alive = rows.filter((n) => !n.isDeleted);
      setNotes(alive);
      setLoading(false);
    }
    void reload();
    const on = () => { void reload(); };
    window.addEventListener('pkm-notes-changed', on);
    return () => { cancelled = true; window.removeEventListener('pkm-notes-changed', on); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      // RLS scopes both tables to the current user; no explicit user_id filter needed.
      const [{ data: gens }, { data: evts }] = await Promise.all([
        supabase.from('pkm_ai_generations').select('note_id, status').eq('status', 'accepted'),
        supabase.from('pkm_mind_events').select('id,type,related_note_ids,summary,created_at').order('created_at', { ascending: false }).limit(500),
      ]);
      if (cancelled) return;
      if (Array.isArray(gens)) {
        setAiAcceptedIds(new Set(gens.map((g: { note_id: string | null }) => g.note_id).filter((x): x is string => !!x)));
      }
      if (Array.isArray(evts)) {
        setEvents(evts.map((e) => ({
          id: e.id as string,
          type: e.type as MindEvent['type'],
          relatedNoteIds: (e.related_note_ids as string[]) ?? [],
          summary: e.summary as string,
          createdAt: new Date(e.created_at as string).getTime(),
        })));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return useMemo<MindState>(() => {
    if (!notes.length) return { ...EMPTY, loading, events };

    // Build a title→id map to count backlinks cheaply.
    const titleIndex = new Map<string, string>();
    for (const n of notes) if (n.title.trim()) titleIndex.set(normalizeTitle(n.title), n.id);
    const incoming = new Map<string, number>();
    for (const n of notes) {
      const targets = extractWikiLinks(n.contentMd);
      for (const t of targets) {
        const id = titleIndex.get(normalizeTitle(t));
        if (id && id !== n.id) incoming.set(id, (incoming.get(id) ?? 0) + 1);
      }
    }

    let massOrganic = 0;
    let massMechanical = 0;
    const organicNoteIds: string[] = [];
    const mechanicalNoteIds: string[] = [];
    let firstNoteAt: number | null = null;

    const mindNotes: MindNote[] = notes.map((n) => {
      const isMech = aiAcceptedIds.has(n.id);
      const hemi: Hemisphere = isMech ? 'mechanical' : 'organic';
      const wordCount = countWords(n.contentMd);
      const backlinkCount = incoming.get(n.id) ?? 0;
      const m = noteMass({ wordCount, isAiSynthesized: isMech, backlinkCount });
      if (isMech) { massMechanical += m; mechanicalNoteIds.push(n.id); }
      else        { massOrganic    += m; organicNoteIds.push(n.id); }
      if (firstNoteAt === null || n.createdAt < firstNoteAt) firstNoteAt = n.createdAt;
      return {
        id: n.id,
        title: n.title || (n.contentMd.split('\n').find((l) => l.trim())?.replace(/^#+\s*/, '').trim() ?? ''),
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
        hemisphere: hemi,
        wordCount,
        backlinkCount,
      };
    });

    return {
      loading,
      firstNoteAt,
      fullness: fullnessLevel(firstNoteAt),
      vitalityOrganic: vitality(massOrganic),
      vitalityMechanical: vitality(massMechanical),
      massOrganic,
      massMechanical,
      organicNoteIds,
      mechanicalNoteIds,
      notes: mindNotes,
      events,
    };
  }, [notes, aiAcceptedIds, events, loading]);
}