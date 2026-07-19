/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/integrations/supabase/client';

export interface SavedLocation {
  id: string;
  lat: number;
  lng: number;
  label: string;
  description: string;
  timestamp: number;
  address?: string;
  city?: string;
  street?: string;
}

export async function fetchLocations(): Promise<SavedLocation[]> {
  const { data, error } = await supabase
    .from('clipboard_items')
    .select('*')
    .eq('clipboard_type', 'location');

  if (error) {
    if (error.message?.includes('supabase_not_configured')) {
      return [];
    }
    console.error('Error fetching locations:', error);
    return [];
  }

  return (data || []).map(item => ({
    id: item.id,
    lat: (item as any).lat || 0,
    lng: (item as any).lng || 0,
    label: (item as any).label || item.title || '',
    description: (item as any).note || item.description || '',
    timestamp: new Date(item.created_at).getTime(),
    address: (item as any).address || undefined,
    city: item.item_from || undefined,
    street: item.source || undefined,
  }));
}

export async function saveLocation(loc: SavedLocation): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return;

  const { error } = await supabase
    .from('clipboard_items')
    .insert({
      id: loc.id,
      user_id: userId,
      item_id: loc.id,
      clipboard_type: 'location',
      title: loc.label,
      description: loc.description,
      lat: loc.lat,
      lng: loc.lng,
      address: loc.address,
      label: loc.label,
      note: loc.description,
      item_from: loc.city,
      source: loc.street,
      created_at: new Date(loc.timestamp).toISOString(),
    } as any);

  if (error) {
    console.error('Error saving location:', error);
    throw error;
  }
}

export async function deleteLocationFromCloud(id: string): Promise<void> {
  const { error } = await supabase
    .from('clipboard_items')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting location:', error);
    throw error;
  }
}
