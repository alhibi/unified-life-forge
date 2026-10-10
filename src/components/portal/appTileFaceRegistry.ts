/**
 * Registry of launcher widget faces (see AppTileFaces). Kept apart from the
 * face components so the component module stays fast-refresh friendly.
 */
import { createElement, memo } from 'react';

import type { FaceProps } from './AppTileFaces';
import * as Faces from './AppTileFaces';

const FACES: Record<string, (props: FaceProps) => ReturnType<typeof Faces.FallbackFace>> = {
  quran: Faces.QuranFace,
  dhikr: Faces.DhikrFace,
  sunnah: Faces.SunnahFace,
  mihrab: Faces.MihrabFace,
  weather: Faces.WeatherFace,
  wellness: Faces.WellnessFace,
  fitness: Faces.FitnessFace,
  journal: Faces.JournalFace,
  'german-club': Faces.GermanFace,
  knowledge: Faces.KnowledgeFace,
  pkm: Faces.PkmFace,
  reading: Faces.ReadingFace,
  marginalia: Faces.MarginaliaFace,
  podcasts: Faces.PodcastsFace,
  diwan: Faces.DiwanFace,
  atlas: Faces.AtlasFace,
  chat: Faces.ChatFace,
  'time-ledger': Faces.TimeLedgerFace,
  games: Faces.GamesFace,
  crypto: Faces.CryptoFace,
};

/** Keys that own a bespoke face — consumed by the registry coverage test. */
export const FACE_KEYS: readonly string[] = Object.keys(FACES);

export interface AppTileFaceProps extends FaceProps {
  appKey: string;
}

export const AppTileFace = memo(function AppTileFace({ appKey, wide, badge }: AppTileFaceProps) {
  return createElement(FACES[appKey] ?? Faces.FallbackFace, { wide, badge });
});
