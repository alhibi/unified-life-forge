import { supabase } from '@/integrations/supabase/client';

export function formatTime(dateStr: string, isAr: boolean) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return isAr ? 'الآن' : 'Jetzt';
  if (diffMins < 60) return isAr ? `${diffMins} د` : `${diffMins} Min`;
  if (diffHours < 24) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays < 7) return d.toLocaleDateString(isAr ? 'ar' : 'de', { weekday: 'short' });
  return d.toLocaleDateString(isAr ? 'ar' : 'de', { day: 'numeric', month: 'short' });
}

export const getSignedFileUrl = async (fileUrl: string): Promise<string> => {
  if (!fileUrl) return '';

  if (fileUrl.startsWith('http')) {
    if (!fileUrl.includes('/chat-files/')) return fileUrl;
    const match = fileUrl.match(/chat-files\/(.+?)(?:\?|$)/);
    if (!match) return fileUrl;
    const path = decodeURIComponent(match[1]);
    const { data, error } = await supabase.storage.from('chat-files').createSignedUrl(path, 3600);
    return error ? fileUrl : data.signedUrl;
  }

  const { data, error } = await supabase.storage.from('chat-files').createSignedUrl(fileUrl, 3600);
  return error ? '' : data.signedUrl;
};

export function formatRecordingTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
