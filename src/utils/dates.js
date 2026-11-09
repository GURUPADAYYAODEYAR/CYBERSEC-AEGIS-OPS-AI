/**
 * Date and time utilities for AEGIS OPS AI.
 */

export function formatDateTime(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return d.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
  } catch {
    return String(isoString);
  }
}

export function formatTimeOnly(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return d.toISOString().substring(11, 19);
  } catch {
    return String(isoString);
  }
}

export function formatRelativeTime(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    
    if (diffSec < 0) return 'in the future';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return '—';
  }
}

/**
 * Calculate Great-Circle distance between two coordinates in kilometers (Haversine formula).
 */
export function calculateGeoDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Calculate implied travel speed in km/h between two events.
 * Returns { distanceKm, elapsedHours, speedKmh, isImpossibleTravel }
 */
export function evaluateTravelVelocity(loc1, time1, loc2, time2, speedThresholdKmh = 900) {
  if (!loc1 || !loc2 || !time1 || !time2) {
    return null;
  }
  
  const t1 = new Date(time1).getTime();
  const t2 = new Date(time2).getTime();
  const elapsedMs = Math.abs(t2 - t1);
  const elapsedHours = elapsedMs / (1000 * 60 * 60);

  const distanceKm = calculateGeoDistanceKm(loc1.lat, loc1.lon, loc2.lat, loc2.lon);
  
  // If consecutive events occur in < 60 seconds with significant distance (> 50 km)
  let speedKmh = 0;
  if (elapsedHours > 0.001) {
    speedKmh = Math.round(distanceKm / elapsedHours);
  } else if (distanceKm > 50) {
    speedKmh = 99999; // Practically instantaneous relocation
  }

  return {
    distanceKm,
    elapsedHours: Number(elapsedHours.toFixed(2)),
    speedKmh,
    isImpossibleTravel: speedKmh > speedThresholdKmh && distanceKm > 300
  };
}

