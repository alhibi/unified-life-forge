import { describe, expect, it } from 'vitest';

import { currentHourIndex, locationTimeToUnix } from '../sources/OpenMeteoAdapter';

describe('Open-Meteo location time', () => {
  it('reads wall-clock times in the location timezone, not the device one', () => {
    // Berlin summer time (+2h): 19:00 local is 17:00 UTC.
    expect(locationTimeToUnix('2026-10-23T19:00', 7200)).toBe(Date.UTC(2026, 9, 23, 17));
  });

  it('starts hourly data at the current hour instead of midnight', () => {
    const times = ['2026-10-23T00:00', '2026-10-23T18:00', '2026-10-23T19:00', '2026-10-23T20:00'];
    expect(currentHourIndex(times, 7200, Date.UTC(2026, 9, 23, 17, 15))).toBe(2);
  });
});
