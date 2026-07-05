import { supabase } from '@/integrations/supabase/client';
import type { ArchiveDocument, ArchiveDocumentSummary, ArchiveDepth, ProgressEvent } from './types';

const FN_URL = `${(import.meta as any).env.VITE_SUPABASE_URL || 'https://nmrckgzmluoavgucqvjh.supabase.co'}/functions/v1/archive-generate`;

export interface ModelConfig {
  outline?: string;   // نموذج تصميم الهيكل
  expansion?: string; // نموذج التوسيع والكتابة
  synthesis?: string; // نموذج التلخيص والوسوم
}

export const archiveApi = {
  async list(): Promise<ArchiveDocumentSummary[]> {
    const { data, error } = await supabase
      .from('archive_documents' as any)
      .select('id, accession_number, title, abstract, tags, depth, word_count, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data ?? []) as any as ArchiveDocumentSummary[];
  },

  async get(id: string): Promise<ArchiveDocument | null> {
    const { data, error } = await supabase
      .from('archive_documents' as any)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as any) ?? null;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('archive_documents' as any).delete().eq('id', id);
    if (error) throw error;
  },

  async search(q: string): Promise<ArchiveDocumentSummary[]> {
    const { data, error } = await (supabase as any).rpc('search_archive', { q, max_rows: 50 });
    if (error) throw error;
    return (data ?? []) as ArchiveDocumentSummary[];
  },

  async *generate(topic: string, depth: ArchiveDepth, models?: ModelConfig, signal?: AbortSignal): AsyncGenerator<ProgressEvent> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('يجب تسجيل الدخول أولاً');

    const requestBody: any = { topic, depth };
    if (models) {
      requestBody.models = models;
    }

    const res = await fetch(FN_URL, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(requestBody),
    });
    if (!res.ok || !res.body) {
      const t = await res.text().catch(() => '');
      throw new Error(`فشل الاتصال بالخادم (${res.status}) ${t.slice(0, 200)}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const parts = buf.split('\n\n');
      buf = parts.pop() || '';
      for (const part of parts) {
        const line = part.split('\n').find(l => l.startsWith('data:'));
        if (!line) continue;
        const jsonStr = line.slice(5).trim();
        if (!jsonStr) continue;
        try {
          yield JSON.parse(jsonStr) as ProgressEvent;
        } catch { /* ignore parse errors */ }
      }
    }
  },
};
