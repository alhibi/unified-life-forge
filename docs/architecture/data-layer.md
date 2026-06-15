# Data Layer

SmartHub uses **Supabase** (Postgres + Auth + Realtime + Storage + Edge
Functions) for cloud features. To keep features swappable and isolated, the
`supabase` client is reached through a single chokepoint per feature.

## The one rule

> No file outside `src/features/*/api.ts` (or `src/lib/<feature>/api.ts`
> for the legacy `lib/chat/` layout) may import from
> `@/integrations/supabase/client`.

Pages, components and hooks call typed functions exported by `api.ts`.
`api.ts` is the only place that knows about table names, RPC names, RLS
rules or realtime channels.

## Reference implementation: `src/lib/chat/`

`lib/chat/` is the canonical example. New features copy this shape:

```text
lib/chat/
  api.ts          One file per domain action: listMyChats(), sendMessage(),
                  reactToMessage(), … Each function returns a typed Promise.
  hooks/          React Query wrappers, one per query/mutation:
                  useChats(), useChatMessages(), useChatMutations(), …
                  Hooks subscribe to realtime and invalidate query keys.
  types.ts        Domain types — never `any`, never `Tables<'chats'>` leaked.
  queryKeys.ts    Typed factory:
                    chatKeys.all              = ['chat']
                    chatKeys.list()           = ['chat','list']
                    chatKeys.messages(id)     = ['chat','messages', id]
  errors.ts       Typed error classes (NotAMember, MessageImmutable, …).
  idbCache.ts     Offline cache (IndexedDB) for instant cold-start paint.
  notifications.ts, performance.ts, settings.ts  — supporting modules.
  index.ts        Barrel.
```

## Patterns

### `api.ts` function signature

```ts
// One-action, typed, throws on failure.
export async function sendMessage(input: SendMessageInput): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ /* … */ })
    .select()
    .single();
  if (error) throw mapError(error);
  return rowToMessage(data);
}
```

### React Query hook

```ts
export function useFoo(id: string) {
  return useQuery({
    queryKey: fooKeys.detail(id),
    queryFn: () => api.getFoo(id),
    enabled: !!id && isSupabaseConfigured,
    staleTime: 30_000,
  });
}
```

### Realtime invalidation

Inside the hook, subscribe to the relevant Postgres changes and invalidate
the query — never expose the channel to the page.

## When `isSupabaseConfigured` is false

`src/integrations/supabase/client.ts` returns a structured 503 for every
request. All `api.ts` functions must propagate the error cleanly so the
hook layer can branch on `error.code === 'supabase_not_configured'` and
render the local-only fallback (where one exists).

## Migration checklist for an existing feature

1. Create `api.ts` and move every `supabase.from(...)` / `supabase.rpc(...)`
   / `supabase.channel(...)` / `supabase.auth.*` call into it.
2. Define typed inputs/outputs in `types.ts`.
3. Define `queryKeys.ts` and wire all hooks to use it.
4. Replace direct `supabase` imports in pages/components with hook calls.
5. Verify no file under the feature (except `api.ts`) imports
   `@/integrations/supabase/client`.