import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * `location` is never null once a request settles: a denial stores
 * MECCA_FALLBACK so consumers still have coordinates. These tests pin the
 * separate `isFallback` flag that lets the UI say «افتراضي» instead of
 * claiming Makkah is the user's local fix.
 */
async function freshModule() {
  vi.resetModules();
  return import('../useDeviceLocation');
}

function mockGeolocation(
  impl: (
    success: PositionCallback,
    error: PositionErrorCallback,
  ) => void,
): void {
  Object.defineProperty(globalThis.navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition: impl },
  });
}

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
  Reflect.deleteProperty(globalThis.navigator, 'geolocation');
});

describe('useDeviceLocation fallback state', () => {
  it('marks Mecca as a fallback when the request is denied with no cache', async () => {
    const { getCurrentDeviceLocation, MECCA_FALLBACK, requestDeviceLocation } =
      await freshModule();
    mockGeolocation((_ok, fail) => fail({ code: 1 } as GeolocationPositionError));

    await requestDeviceLocation();

    const state = getCurrentDeviceLocation();
    expect(state.location).toEqual(MECCA_FALLBACK);
    expect(state.status).toBe('denied');
    expect(state.isFallback).toBe(true);
  });

  it('keeps a cached fix marked as local when a refresh is denied', async () => {
    const cached = { lat: 24.7136, lng: 46.6753 };
    localStorage.setItem('lastLocation', JSON.stringify(cached));
    const { getCurrentDeviceLocation, requestDeviceLocation } = await freshModule();
    mockGeolocation((_ok, fail) => fail({ code: 1 } as GeolocationPositionError));

    await requestDeviceLocation();

    const state = getCurrentDeviceLocation();
    expect(state.location).toEqual(cached);
    expect(state.status).toBe('denied');
    expect(state.isFallback).toBe(false);
  });

  it('clears the fallback flag on a granted fix and persists it', async () => {
    const { getCurrentDeviceLocation, requestDeviceLocation } = await freshModule();
    mockGeolocation((ok) =>
      ok({
        coords: { latitude: 30.0444, longitude: 31.2357 },
      } as GeolocationPosition),
    );

    await requestDeviceLocation();

    const state = getCurrentDeviceLocation();
    expect(state.location).toEqual({ lat: 30.0444, lng: 31.2357 });
    expect(state.status).toBe('granted');
    expect(state.isFallback).toBe(false);
    expect(JSON.parse(localStorage.getItem('lastLocation') ?? 'null')).toEqual({
      lat: 30.0444,
      lng: 31.2357,
    });
  });

  it('flags the fallback when geolocation does not exist', async () => {
    const { getCurrentDeviceLocation, requestDeviceLocation } = await freshModule();
    // jsdom ships no geolocation by default, so this is the "unavailable" path.
    await requestDeviceLocation();

    const state = getCurrentDeviceLocation();
    expect(state.status).toBe('unavailable');
    expect(state.isFallback).toBe(true);
  });
});
