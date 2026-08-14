/** Domain types for Marginalia — «الهوامش»: أرشيف شخصي يكتشف الروابط. */

export type MgArticleStatus = 'queued' | 'processed' | 'error';

export interface MgSource {
  id: string;
  name: string;
  feed_url: string;
  active: boolean;
  last_fetched_at: string | null;
  last_error: string | null;
}

export interface MgArticle {
  id: string;
  source_id: string | null;
  url: string;
  title: string | null;
  author: string | null;
  published_at: string | null;
  fetched_at: string;
  summary: string | null;
  domain_tags: string[];
  word_count: number;
  status: MgArticleStatus;
  error_message: string | null;
}

export type MgLens = 'structural' | 'tension' | 'lineage';
export type MgConfidence = 'speculative' | 'plausible' | 'strong';
export type MgConnectionStatus = 'new' | 'kept' | 'dismissed';

export interface MgConnection {
  id: string;
  article_ids: string[];
  lens: MgLens;
  connection_text: string;
  why_it_matters: string | null;
  novelty_score: number;
  confidence_label: MgConfidence;
  status: MgConnectionStatus;
  model_used: string | null;
  created_at: string;
}

export interface MgConversation {
  id: string;
  title: string | null;
  seed_connection_id: string | null;
  updated_at: string;
}

export interface MgMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  model_used: string | null;
  cited_article_ids: string[];
  created_at: string;
}

export interface MgPin {
  id: string;
  connection_id: string;
  user_note: string | null;
  pinned_at: string;
}

export const LENS_LABEL: Record<MgLens, string> = {
  structural: 'بنيوي',
  tension: 'تناقض',
  lineage: 'نَسَب فكري',
};

export const CONFIDENCE_LABEL: Record<MgConfidence, string> = {
  speculative: 'تخميني',
  plausible: 'محتمل',
  strong: 'قوي',
};
