import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as journalApi from '../api';
import { journalKeys } from '../queryKeys';
import type { JournalEntry, JournalEntryInput } from '../types';

export function useJournalEntries() {
  return useQuery<JournalEntry[]>({
    queryKey: journalKeys.list(),
    queryFn: () => journalApi.listEntries(),
    staleTime: 30_000,
  });
}

export function useJournalMutations() {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (input: JournalEntryInput) => journalApi.createEntry(input),
    onSuccess: (entry) => {
      qc.setQueryData<JournalEntry[]>(journalKeys.list(), (prev) =>
        prev ? [entry, ...prev] : [entry],
      );
    },
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<JournalEntryInput> }) =>
      journalApi.updateEntry(id, patch),
    onSuccess: (entry) => {
      qc.setQueryData<JournalEntry[]>(journalKeys.list(), (prev) =>
        prev ? prev.map((e) => (e.id === entry.id ? entry : e)) : [entry],
      );
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => journalApi.deleteEntry(id),
    onSuccess: (_data, id) => {
      qc.setQueryData<JournalEntry[]>(journalKeys.list(), (prev) =>
        prev ? prev.filter((e) => e.id !== id) : prev,
      );
    },
  });

  return { create, update, remove };
}