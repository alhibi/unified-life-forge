import { supabase } from '@/integrations/supabase/client';

import type { Message } from '../types';

/** Newest-first cap on how much shared media the profile tab loads at once. */
const SHARED_MEDIA_LIMIT = 50;

/**
 * Loads the images and files exchanged in a conversation, for the profile
 * panel's media tab.
 *
 * This query was written out twice inside ChatDrawer.tsx — once in the profile
 * panel's tab button and once in the header's "shared media" menu item — so a
 * change to one (the limit, the ordering, the deleted filter) would silently
 * diverge from the other. One definition now.
 *
 * Known debt: docs/CONTRIBUTING.md §2.1 says Supabase calls belong in a
 * feature's api.ts. Chat has no api.ts yet; its data layer lives in
 * src/lib/chat/. Moving this there is a follow-up, kept out of the ChatDrawer
 * split so the two changes stay reviewable apart.
 */
export async function fetchSharedMedia(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .in('message_type', ['image', 'file'])
    .eq('deleted', false)
    .order('created_at', { ascending: false })
    .limit(SHARED_MEDIA_LIMIT);

  if (error) {
    console.warn('[chat] could not load shared media:', error.message);
    return [];
  }
  return (data ?? []) as Message[];
}
