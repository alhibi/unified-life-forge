import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';
import { getMessagePreview } from '../chatUtils';
import type { Conversation } from '../types';

/**
 * Fetch the caller's conversations enriched with:
 *  - the other participant's profile (username, display name, avatar, bio)
 *  - the other participant's last-seen timestamp (via `get_last_seen` RPC —
 *    profiles.last_seen is not directly selectable for privacy)
 *  - a preview of the most recent message + its status flags
 *  - unread count (server-side count of unread rows from the peer)
 *
 * Returns [] on any failure so the caller can treat the fetch as
 * best-effort. The caller owns loading state and error toasts.
 */
export async function fetchConversations(user: User, isAr: boolean): Promise<Conversation[]> {
  const { data: convs, error: convsErr } = await supabase
    .from('conversations')
    .select('*')
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .order('updated_at', { ascending: false });

  if (convsErr || !convs) return [];

  const otherIds = convs.map(c => c.user1_id === user.id ? c.user2_id : c.user1_id);
  const convIds = convs.map(c => c.id);

  const [profilesRes, allMsgsRes, unreadMsgsRes, lastSeenRes] = await Promise.all([
    supabase.from('profiles')
      .select('user_id, username, display_name, avatar_url, bio, created_at')
      .in('user_id', otherIds),
    Promise.all(convIds.map(cid =>
      (supabase.from('messages') as any)
        .select('conversation_id, sender_id, content, message_type, deleted, created_at, file_name, hidden_for, read, delivered_at')
        .eq('conversation_id', cid)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    )).then(results => ({
      data: results.map((r: any) => r.data).filter(Boolean) as Array<{
        conversation_id: string; sender_id: string; content: string; message_type: string; deleted: boolean; created_at: string; file_name: string | null; hidden_for: string[] | null; read: boolean; delivered_at: string | null;
      }>,
      error: null,
    })),
    supabase.from('messages')
      .select('conversation_id')
      .in('conversation_id', convIds)
      .neq('sender_id', user.id)
      .eq('read', false)
      .eq('deleted', false),
    Promise.all(otherIds.map(async (id) => {
      const { data } = await supabase.rpc('get_last_seen', { target_user_id: id });
      return { user_id: id, last_seen: (data as string | null) ?? null };
    })),
  ]);

  const profiles = profilesRes.data || [];
  const allMsgs = allMsgsRes.data || [];
  const unreadMsgs = unreadMsgsRes.data || [];
  const lastSeenMap = new Map<string, string | null>(
    (lastSeenRes || []).map((r) => [r.user_id, r.last_seen]),
  );

  const lastMsgMap = new Map<string, typeof allMsgs[0]>();
  for (const m of allMsgs) {
    if (!lastMsgMap.has(m.conversation_id)) lastMsgMap.set(m.conversation_id, m);
  }

  const unreadCountMap = new Map<string, number>();
  for (const m of unreadMsgs) {
    unreadCountMap.set(m.conversation_id, (unreadCountMap.get(m.conversation_id) || 0) + 1);
  }

  return convs.map((conv) => {
    const otherId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;
    const profile = profiles.find(p => p.user_id === otherId);
    const lastMsg = lastMsgMap.get(conv.id);
    const unreadCount = unreadCountMap.get(conv.id) || 0;

    return {
      ...conv,
      otherUsername: profile?.username || '?',
      otherDisplayName: profile?.display_name ?? profile?.username ?? '?',
      otherAvatarUrl: profile?.avatar_url ?? undefined,
      otherUserId: otherId,
      otherBio: (profile as unknown as { bio?: string | null })?.bio ?? null,
      otherLastSeen: lastSeenMap.get(otherId) ?? null,
      otherCreatedAt: (profile as unknown as { created_at?: string | null })?.created_at ?? null,
      lastMessage: lastMsg ? getMessagePreview(lastMsg, isAr, user.id) : undefined,
      lastMessageType: lastMsg?.message_type,
      lastMessageFromMe: lastMsg?.sender_id === user.id,
      lastMessageDeleted: lastMsg?.deleted,
      lastMessageTime: lastMsg?.created_at || conv.updated_at,
      lastMessageRead: lastMsg?.sender_id === user.id ? !!lastMsg?.read : undefined,
      lastMessageDelivered: lastMsg?.sender_id === user.id ? !!lastMsg?.delivered_at : undefined,
      unreadCount,
    } as Conversation;
  });
}