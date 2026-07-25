import { describe, expect,it } from 'vitest';

import { MemoryCache } from '../cache/MemoryCache';
import {
apparentTemperature_C,
  classifyThermalComfort, dewPoint_C, heatIndex_C, vaporPressureDeficit_kPa,   wetBulb_C, windChill_C,
} from '../compute/ThermalCalculator';
import { beaufortScale,degreesToCardinal16 } from '../compute/UnitConverter';
import { CircuitBreaker } from '../engine/CircuitBreaker';
import { aggregate } from '../engine/EnsembleAggregator';

describe('EnsembleAggregator', () => {
  it('weighted average of 5 sources', () => {
    const r = aggregate([
      { sourceId: 'open-meteo',     value: 20, weight: 0.22 },
      { sourceId: 'met-norway',     value: 21, weight: 0.19 },
      { sourceId: 'noaa',           value: 19, weight: 0.17 },
      { sourceId: 'openweathermap', value: 20.5, weight: 0.13 },
      { sourceId: 'weatherbit',     value: 20.2, weight: 0.10 },
    ]);
    expect(r.value).toBeGreaterThan(19);
    expect(r.value).toBeLessThan(21);
    expect(r.models_in_agreement.length).toBe(5);
    expect(r.models_outlier.length).toBe(0);
    expect(r.confidence_percent).toBeGreaterThan(85);
  });

  it('Grubbs detects a clear outlier', () => {
    const r = aggregate([
      { sourceId: 'open-meteo',     value: 20, weight: 0.22 },
      { sourceId: 'met-norway',     value: 21, weight: 0.19 },
      { sourceId: 'noaa',           value: 20, weight: 0.17 },
      { sourceId: 'openweathermap', value: 20, weight: 0.13 },
      { sourceId: 'weatherbit',     value: 80, weight: 0.10 },   // outlier
    ]);
    expect(r.models_outlier).toContain('weatherbit');
  });
});

describe('CircuitBreaker', () => {
  it('transitions closed → open after 3 failures', () => {
    localStorage.clear();
    const b = new CircuitBreaker();
    expect(b.allow('open-meteo')).toBe(true);
    b.recordFailure('open-meteo', 100);
    b.recordFailure('open-meteo', 100);
    b.recordFailure('open-meteo', 100);
    expect(b.snapshot('open-meteo').state).toBe('open');
    expect(b.allow('open-meteo')).toBe(false);
  });

  it('closes on success', () => {
    localStorage.clear();
    const b = new CircuitBreaker();
    b.recordFailure('met-norway', 50);
    b.recordSuccess('met-norway', 200);
    expect(b.snapshot('met-norway').state).toBe('closed');
    expect(b.snapshot('met-norway').consecutiveFailures).toBe(0);
  });
});

describe('MemoryCache TTL', () => {
  it('expires after TTL', async () => {
    const m = new MemoryCache<number>();
    m.set('k', 42, 10);
    expect(m.get('k')).toBe(42);
    await new Promise(r => setTimeout(r, 20));
    expect(m.get('k')).toBeNull();
  });
});

describe('Thermal calculations', () => {
  it('dew point of 25°C / 60% RH ≈ 16.7°C', () => {
    expect(Math.round(dewPoint_C(25, 60))).toBe(17);
  });
  it('wet bulb of 30°C / 50% RH ≈ 22°C', () => {
    expect(Math.round(wetBulb_C(30, 50))).toBe(22);
  });
  it('heat index null below threshold', () => {
    expect(heatIndex_C(20, 60)).toBeNull();
  });
  it('heat index returns above threshold', () => {
    expect(heatIndex_C(32, 70)).toBeGreaterThan(32);
  });
  it('wind chill null above 10°C', () => {
    expect(windChill_C(15, 20)).toBeNull();
  });
  it('VPD positive', () => {
    expect(vaporPressureDeficit_kPa(25, 50)).toBeGreaterThan(0);
  });
  it('apparent uses HI when hot', () => {
    expect(apparentTemperature_C(35, 70, 5)).toBeGreaterThan(35);
  });
  it('classifies comfort', () => {
    expect(classifyThermalComfort(22)).toBe('comfortable');
    expect(classifyThermalComfort(-20)).toBe('dangerously_cold');
    expect(classifyThermalComfort(42)).toBe('dangerously_hot');
  });
});

describe('Unit helpers', () => {
  it('compass 0° → N', () => expect(degreesToCardinal16(0)).toBe('N'));
  it('compass 45° → NE', () => expect(degreesToCardinal16(45)).toBe('NE'));
  it('compass 360° wraps to N', () => expect(degreesToCardinal16(360)).toBe('N'));
  it('beaufort calm', () => expect(beaufortScale(0).scale).toBe(0));
  it('beaufort hurricane', () => expect(beaufortScale(40).scale).toBe(12));
});
