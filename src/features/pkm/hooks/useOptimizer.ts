import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type OptimizerMode = 'A' | 'B';
export type OptimizerStatus =
  | 'idle' | 'streaming' | 'done' | 'error' | 'aborted' | 'rate_limited' | 'credits_exhausted';

interface RunArgs {
  content: string;
  title: string;
  tags: string[];
  linkedNotes: string[];
  mode: OptimizerMode;
}

/**
 * Streams the note optimizer edge function through SSE.
 * Errors from the gateway are surfaced as dedicated status values so
 * the UI can render clear guidance instead of a generic failure.
 */
export function useOptimizer() {
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<OptimizerStatus>('idle');
  const abortRef = useRef<AbortController | null>(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    setOutput('');
    setStatus('idle');
  }, []);

  const run = useCallback(async (args: RunArgs) => {
    setOutput('');
    setStatus('streaming');
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatus('error');
        return;
      }
      const url = `https://nmrckgzmluoavgucqvjh.supabase.co/functions/v1/pkm-optimize`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: (supabase as unknown as { supabaseKey?: string }).supabaseKey ?? '',
        },
        body: JSON.stringify(args),
        signal: ctrl.signal,
      });

      if (res.status === 429) { setStatus('rate_limited'); return; }
      if (res.status === 402) { setStatus('credits_exhausted'); return; }
      if (!res.ok || !res.body) { setStatus('error'); return; }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (!data || data === '[DONE]') continue;
          try {
            const json = JSON.parse(data);
            const delta = json?.choices?.[0]?.delta?.content;
            if (typeof delta === 'string' && delta.length) {
              setOutput((prev) => prev + delta);
            }
          } catch { /* ignore malformed SSE frames */ }
        }
      }
      setStatus('done');
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') setStatus('aborted');
      else setStatus('error');
    }
  }, []);

  return { output, status, run, cancel, reset };
}