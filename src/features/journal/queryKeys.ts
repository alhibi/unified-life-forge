// Typed React Query key factory for the journal feature.
export const journalKeys = {
  all: ['journal'] as const,
  list: () => [...journalKeys.all, 'list'] as const,
  detail: (id: string) => [...journalKeys.all, 'detail', id] as const,
};