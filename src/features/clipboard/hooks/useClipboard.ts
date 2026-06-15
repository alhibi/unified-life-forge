import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface ClipboardItem {
  id: string;
  title: string;
  description: string;
  source: string;
  from: string;
  savedAt: string;
}

const LOCAL_KEYS: Record<string, string> = {
  sunnah: 'sunnah-clipboard',
  untimed: 'untimed-sunnah-clipboard',
};

function getLocal(type: string): ClipboardItem[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEYS[type] || type) || '[]');
  } catch {
    return [];
  }
}

function setLocal(type: string, items: ClipboardItem[]) {
  localStorage.setItem(LOCAL_KEYS[type] || type, JSON.stringify(items));
}

export function useClipboard(clipboardType: string) {
  const { user } = useAuth();
  const [items, setItems] = useState<ClipboardItem[]>(() => getLocal(clipboardType));
  const [synced, setSynced] = useState(false);

  // Sync from cloud on login
  useEffect(() => {
    if (!user) {
      setSynced(false);
      return;
    }

    const syncFromCloud = async () => {
      const { data } = await supabase
        .from('clipboard_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('clipboard_type', clipboardType);

      if (data && data.length > 0) {
        const cloudItems: ClipboardItem[] = data.map((d: any) => ({
          id: d.item_id,
          title: d.title,
          description: d.description || '',
          source: d.source || '',
          from: d.item_from || '',
          savedAt: d.saved_at,
        }));

        // Merge: cloud items + local-only items
        const localItems = getLocal(clipboardType);
        const cloudIds = new Set(cloudItems.map(i => i.id));
        const localOnly = localItems.filter(i => !cloudIds.has(i.id));

        // Upload local-only items to cloud
        if (localOnly.length > 0) {
          const inserts = localOnly.map(i => ({
            user_id: user.id,
            item_id: i.id,
            clipboard_type: clipboardType,
            title: i.title,
            description: i.description,
            source: i.source,
            item_from: i.from,
            saved_at: i.savedAt,
          }));
          await supabase.from('clipboard_items').upsert(inserts, { onConflict: 'user_id,item_id,clipboard_type' });
        }

        const merged = [...cloudItems, ...localOnly];
        setItems(merged);
        setLocal(clipboardType, merged);
      } else {
        // No cloud data - upload all local items
        const localItems = getLocal(clipboardType);
        if (localItems.length > 0) {
          const inserts = localItems.map(i => ({
            user_id: user.id,
            item_id: i.id,
            clipboard_type: clipboardType,
            title: i.title,
            description: i.description,
            source: i.source,
            item_from: i.from,
            saved_at: i.savedAt,
          }));
          await supabase.from('clipboard_items').upsert(inserts, { onConflict: 'user_id,item_id,clipboard_type' });
        }
        setItems(localItems);
      }
      setSynced(true);
    };

    syncFromCloud();
  }, [user, clipboardType]);

  // Save to localStorage whenever items change (after initial sync)
  useEffect(() => {
    setLocal(clipboardType, items);
  }, [items, clipboardType]);

  const addItem = useCallback(async (item: ClipboardItem) => {
    setItems(prev => {
      if (prev.some(s => s.id === item.id)) return prev;
      return [...prev, item];
    });

    if (user) {
      await supabase.from('clipboard_items').upsert({
        user_id: user.id,
        item_id: item.id,
        clipboard_type: clipboardType,
        title: item.title,
        description: item.description,
        source: item.source,
        item_from: item.from,
        saved_at: item.savedAt,
      }, { onConflict: 'user_id,item_id,clipboard_type' });
    }
  }, [user, clipboardType]);

  const removeItem = useCallback(async (itemId: string) => {
    setItems(prev => prev.filter(s => s.id !== itemId));

    if (user) {
      await supabase
        .from('clipboard_items')
        .delete()
        .eq('user_id', user.id)
        .eq('item_id', itemId)
        .eq('clipboard_type', clipboardType);
    }
  }, [user, clipboardType]);

  const toggleItem = useCallback(async (item: ClipboardItem) => {
    const exists = items.some(s => s.id === item.id);
    if (exists) {
      await removeItem(item.id);
    } else {
      await addItem(item);
    }
  }, [items, addItem, removeItem]);

  const isItemSaved = useCallback((itemId: string) => {
    return items.some(s => s.id === itemId);
  }, [items]);

  return { items, addItem, removeItem, toggleItem, isItemSaved, setItems };
}
