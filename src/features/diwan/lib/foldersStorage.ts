/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/integrations/supabase/client';

export interface DiwanFolder {
  id: string;
  name: string;
  color?: string;
  order_index: number;
  created_at: string;
}

export interface DiwanFolderItem {
  folder_id: string;
  poem_id: number;
  added_at: string;
}

const KEY = 'diwan-custom-folders';

export async function fetchDiwanFolders(): Promise<DiwanFolder[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch { return []; }
  }

  const { data, error } = await supabase
    .from('diwan_folders')
    .select('*')
    .order('order_index', { ascending: true });

  if (error) {
    if (error.message?.includes('supabase_not_configured')) {
      try {
        return JSON.parse(localStorage.getItem(KEY) || '[]');
      } catch { return []; }
    }
    console.error('Error fetching diwan folders:', error);
    return [];
  }

  const folders = (data || []) as DiwanFolder[];
  localStorage.setItem(KEY, JSON.stringify(folders));
  return folders;
}

export async function createDiwanFolder(name: string, color?: string): Promise<DiwanFolder | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  const id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
  const newFolder: DiwanFolder = {
    id,
    name,
    color,
    order_index: 0,
    created_at: new Date().toISOString()
  };

  if (!userId) {
    try {
      const local = JSON.parse(localStorage.getItem(KEY) || '[]');
      local.push(newFolder);
      localStorage.setItem(KEY, JSON.stringify(local));
      return newFolder;
    } catch { return null; }
  }

  const { data, error } = await supabase
    .from('diwan_folders')
    .insert({
      id,
      user_id: userId,
      name,
      color,
      order_index: 0,
      created_at: newFolder.created_at
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating diwan folder:', error);
    return null;
  }

  await fetchDiwanFolders(); // Refresh cache
  return data as DiwanFolder;
}

export async function deleteDiwanFolder(id: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  if (!userId) {
    try {
      const local = JSON.parse(localStorage.getItem(KEY) || '[]');
      const filtered = local.filter((f: any) => f.id !== id);
      localStorage.setItem(KEY, JSON.stringify(filtered));
      return;
    } catch { return; }
  }

  const { error } = await supabase
    .from('diwan_folders')
    .delete()
    .eq('id', id);

  if (error) console.error('Error deleting diwan folder:', error);
  await fetchDiwanFolders(); // Refresh cache
}

export async function addPoemToFolder(folderId: string, poemId: number): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  if (!userId) {
    const itemKey = `diwan-folder-items-${folderId}`;
    try {
      const local = JSON.parse(localStorage.getItem(itemKey) || '[]');
      if (!local.includes(poemId)) {
        local.push(poemId);
        localStorage.setItem(itemKey, JSON.stringify(local));
      }
      return;
    } catch { return; }
  }

  const { error } = await supabase
    .from('diwan_folder_items')
    .insert({
      folder_id: folderId,
      poem_id: poemId,
      added_at: new Date().toISOString()
    });

  if (error) {
    console.error('Error adding poem to folder:', error);
  }
}
