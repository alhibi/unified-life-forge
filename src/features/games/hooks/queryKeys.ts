export const gameKeys = {
  all: ['games'] as const,
  progress: (game: string) => [...gameKeys.all, 'progress', game] as const,
};
