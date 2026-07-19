export interface GameProgress {
  user_id: string;
  game: string;
  state: Record<string, any>;
  updated_at: string;
}
