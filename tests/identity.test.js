import { describe, it, expect } from 'vitest';
import { calculateGeoDistanceKm, evaluateTravelVelocity } from '../src/utils/dates.js';

describe('AuthWatch Identity Travel & Geolocation Tests', () => {
  it('should accurately calculate Haversine distance between Frankfurt and Tokyo', () => {
    // Frankfurt (50.1109, 8.6821) to Tokyo (35.6762, 139.6503) is ~9,330 km
    const dist = calculateGeoDistanceKm(50.1109, 8.6821, 35.6762, 139.6503);
    expect(dist).toBeGreaterThan(9000);
    expect(dist).toBeLessThan(9500);
  });

  it('should flag impossible travel velocity exceeding 900 km/h in short duration', () => {
    const loc1 = { city: 'Frankfurt', lat: 50.1109, lon: 8.6821 };
    const time1 = '2026-11-09T08:00:00Z';

    const loc2 = { city: 'Tokyo', lat: 35.6762, lon: 139.6503 };
    const time2 = '2026-11-09T08:15:00Z'; // 15 mins later

    const result = evaluateTravelVelocity(loc1, time1, loc2, time2, 900);
    expect(result).not.toBeNull();
    expect(result.isImpossibleTravel).toBe(true);
    expect(result.speedKmh).toBeGreaterThan(10000);
  });

  it('should not flag normal travel within reasonable elapsed hours', () => {
    const loc1 = { city: 'New York', lat: 40.7128, lon: -74.0060 };
    const time1 = '2026-11-09T08:00:00Z';

    const loc2 = { city: 'Philadelphia', lat: 39.9526, lon: -75.1652 }; // ~130 km
    const time2 = '2026-11-09T11:00:00Z'; // 3 hours later

    const result = evaluateTravelVelocity(loc1, time1, loc2, time2, 900);
    expect(result.isImpossibleTravel).toBe(false);
  });
});

