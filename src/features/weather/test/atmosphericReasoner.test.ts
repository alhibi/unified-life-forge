import { describe, expect, it } from 'vitest';

import { deriveAtmosphericInsights } from '../compute/AtmosphericReasoner';
import type { WeatherSnapshot } from '../types/WeatherSnapshot';

/* ------------------------------------------------------------------ */
/* Fixture builder — only fields the reasoner reads; the rest are      */
/* zeroed/null so missing data paths are exercised honestly.           */
/* ------------------------------------------------------------------ */

type PartialSnapshot = Record<string, unknown>;

function makeSnapshot(overrides: PartialSnapshot = {}): WeatherSnapshot {
  const base: PartialSnapshot = {
    temperature: {
      actual_c: 22,
      apparent_c: 22,
      dew_point_c: 10,
      wet_bulb_c: 14,
      daily_high_c: 25,
      daily_low_c: 14,
      discomfort_index: 68,
      ensemble_range_c: { min: 20, max: 24 },
    },
    moisture: {
      relative_humidity_percent: 50,
      absolute_humidity_gm3: 9.6,
      specific_humidity_gkg: 7.7,
      vapor_pressure_deficit_kpa: 1.2,
      soil_moisture_0_1cm_m3m3: null,
      soil_temperature_6cm_c: null,
    },
    pressure: {
      msl_hpa: 1015,
      tendency_hpa_per_3hr: 0.2,
      tendency_direction: 'steady',
      tendency_label: 'مستقر',
    },
    wind: {
      speed_kph: 10,
      gusts_kph: 14,
      direction_deg: 180,
      beaufort_scale: 2,
    },
    sky: {
      cloud_cover_total_percent: 20,
      visibility_km: 20,
      fog_probability_percent: 0,
      cloud_base_m: 1500,
    },
    solar: {
      uv_index: 4,
      ghi_wm2: 0,
      clear_sky_ghi_wm2: null,
      dni_wm2: null,
    },
    precipitation: {
      probability_percent: 0,
      intensity_mm_hr: 0,
      accumulation_6h_mm: 0,
      thunder_probability_percent: 0,
    },
    airQuality: {
      aqi_us: 40,
    },
  };

  // Deep-merge overrides (one level is enough for these tests).
  const merged: PartialSnapshot = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      typeof merged[key] === 'object'
    ) {
      merged[key] = { ...(merged[key] as object), ...(value as object) };
    } else {
      merged[key] = value;
    }
  }
  return merged as unknown as WeatherSnapshot;
}

/* ------------------------------------------------------------------ */
/* Magnus–Tetens LCL sanity                                            */
/* ------------------------------------------------------------------ */

describe('LCL estimation sanity', () => {
  it('wide T−Td spread → high cloud base → no rain-window inference', () => {
    const snap = makeSnapshot({
      moisture: { relative_humidity_percent: 30 },
      sky: { cloud_cover_total_percent: 80 },
    });
    const insights = deriveAtmosphericInsights(snap);
    expect(insights.find((i) => i.id === 'rain-window-open')).toBeUndefined();
  });

  it('near-saturated air + low base + falling pressure → rain window opens', () => {
    const snap = makeSnapshot({
      temperature: { actual_c: 18, dew_point_c: 17 }, // spread 1° → base ~125 m
      moisture: { relative_humidity_percent: 94 },
      sky: { cloud_cover_total_percent: 90 },
      pressure: { tendency_direction: 'falling' },
    });
    const insights = deriveAtmosphericInsights(snap);
    const rainWindow = insights.find((i) => i.id === 'rain-window-open');
    expect(rainWindow).toBeDefined();
    expect(rainWindow?.confidence).toBe('medium');
    expect(rainWindow?.mechanismAr).toContain('125');
  });

  it('returns empty array when inputs are degenerate', () => {
    const snap = makeSnapshot({
      sky: { cloud_cover_total_percent: 0 },
      moisture: { relative_humidity_percent: 10 },
      solar: { ghi_wm2: 0, clear_sky_ghi_wm2: null },
      wind: { speed_kph: 0, gusts_kph: 0 },
      pressure: { tendency_hpa_per_3hr: 0 },
    });
    // Daytime hour by default in CI? Force determinism via explicit call at noon.
    const noon = new Date(2026, 7, 22, 12, 0, 0);
    const insights = deriveAtmosphericInsights(snap, noon);
    // No night-only rules, no sun (ghi=0), no gust ratio, no ΔP.
    expect(insights).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* Night physics                                                       */
/* ------------------------------------------------------------------ */

describe('night radiative cooling', () => {
  it('clear calm night → fast-drop headline with high confidence', () => {
    const snap = makeSnapshot({
      temperature: { actual_c: 15, dew_point_c: 9, daily_low_c: 8 },
      sky: { cloud_cover_total_percent: 5 },
      wind: { speed_kph: 5, gusts_kph: 6 },
    });
    const lateEvening = new Date(2026, 7, 22, 21, 0, 0);
    const insights = deriveAtmosphericInsights(snap, lateEvening);
    const cooling = insights.find((i) => i.id === 'tonight-cooling');
    expect(cooling).toBeDefined();
    expect(cooling?.confidence).toBe('high');
    expect(cooling?.headlineAr).toContain('انخفاض سريع');
  });

  it('fog imminent when T−Td ≤ 2° with light wind at night', () => {
    const snap = makeSnapshot({
      temperature: { actual_c: 11.8, dew_point_c: 11.2 },
      wind: { speed_kph: 4, gusts_kph: 5 },
    });
    const night = new Date(2026, 7, 22, 23, 30, 0);
    const insights = deriveAtmosphericInsights(snap, night);
    expect(insights.find((i) => i.id === 'fog-imminent')).toBeDefined();
  });
});

/* ------------------------------------------------------------------ */
/* Wind character                                                      */
/* ------------------------------------------------------------------ */

describe('gust-factor inference', () => {
  it('ratio ≥ 1.8 flags turbulent wind with gust phrasing', () => {
    const snap = makeSnapshot({ wind: { speed_kph: 20, gusts_kph: 45 } });
    const insights = deriveAtmosphericInsights(snap);
    const turb = insights.find((i) => i.id === 'turbulent-wind');
    expect(turb).toBeDefined();
    expect(turb?.headlineAr).toContain('45');
  });

  it('smooth ratio on a decent breeze → laminar note', () => {
    const snap = makeSnapshot({ wind: { speed_kph: 25, gusts_kph: 27 } });
    const insights = deriveAtmosphericInsights(snap);
    expect(insights.find((i) => i.id === 'laminar-wind')).toBeDefined();
  });
});

/* ------------------------------------------------------------------ */
/* Solar ceiling & compound stress                                     */
/* ------------------------------------------------------------------ */

describe('solar transparency ratio', () => {
  it('GHI near clear-sky ceiling → transparent-sky headline', () => {
    const snap = makeSnapshot({
      solar: { ghi_wm2: 860, clear_sky_ghi_wm2: 900, uv_index: 6 },
    });
    const insights = deriveAtmosphericInsights(snap);
    const solar = insights.find((i) => i.id === 'solar-ceiling');
    expect(solar).toBeDefined();
    expect(solar?.headlineAr).toContain('96%');
  });

  it('compound stress fires only when two or more hazards coexist', () => {
    // One hazard alone → silent.
    const mild = makeSnapshot({ solar: { uv_index: 9 } });
    expect(
      deriveAtmosphericInsights(mild).find((i) => i.id === 'compound-stress')
    ).toBeUndefined();

    // Heat + humidity + UV → fires and names them.
    const harsh = makeSnapshot({
      temperature: { apparent_c: 38 },
      moisture: { relative_humidity_percent: 78 },
      solar: { uv_index: 9 },
    });
    const stress = deriveAtmosphericInsights(harsh).find(
      (i) => i.id === 'compound-stress'
    );
    expect(stress).toBeDefined();
    expect(stress?.headlineAr).toContain('إجهاد حراري');
    expect(stress?.headlineAr).toContain('حرق شمسي');
  });
});

/* ------------------------------------------------------------------ */
/* Pressure narrative                                                  */
/* ------------------------------------------------------------------ */

describe('pressure storytelling', () => {
  it('rapid fall → storm-approaching headline with exact delta', () => {
    const snap = makeSnapshot({
      pressure: { tendency_hpa_per_3hr: -3.4, tendency_direction: 'rapidly_falling' },
    });
    const insights = deriveAtmosphericInsights(snap);
    const story = insights.find((i) => i.id === 'pressure-story');
    expect(story?.headlineAr).toContain('نظام جوي يقترب');
    expect(story?.mechanismAr).toContain('-3.4');
    expect(story?.confidence).toBe('high');
  });

  it('zero delta stays silent (nothing to say)', () => {
    const snap = makeSnapshot({ pressure: { tendency_hpa_per_3hr: 0 } });
    expect(
      deriveAtmosphericInsights(snap).find((i) => i.id === 'pressure-story')
    ).toBeUndefined();
  });
});
