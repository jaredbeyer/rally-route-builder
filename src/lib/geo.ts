import type { RoutePoint } from './types';

export function toRad(d: number): number {
  return (d * Math.PI) / 180;
}

export function toDeg(r: number): number {
  return (r * 180) / Math.PI;
}

export function haversine(p1: { lat: number; lon: number }, p2: { lat: number; lon: number }): number {
  const R = 6371000;
  const dLat = toRad(p2.lat - p1.lat);
  const dLon = toRad(p2.lon - p1.lon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function bearing(p1: { lat: number; lon: number }, p2: { lat: number; lon: number }): number {
  const dLon = toRad(p2.lon - p1.lon);
  const y = Math.sin(dLon) * Math.cos(toRad(p2.lat));
  const x =
    Math.cos(toRad(p1.lat)) * Math.sin(toRad(p2.lat)) -
    Math.sin(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function interpolate(
  p1: { lat: number; lon: number },
  p2: { lat: number; lon: number },
  fraction: number
): { lat: number; lon: number } {
  return {
    lat: p1.lat + (p2.lat - p1.lat) * fraction,
    lon: p1.lon + (p2.lon - p1.lon) * fraction,
  };
}

/** Walk backward along the track from `idx` by `meters` (rally call before the corner). */
export function pointBefore(
  points: RoutePoint[],
  idx: number,
  meters: number
): { lat: number; lon: number; idx: number } {
  if (!points.length) return { lat: 0, lon: 0, idx: 0 };
  let i = Math.min(Math.max(Math.round(idx), 0), points.length - 1);
  let remaining = Math.max(0, meters);
  while (i > 0 && remaining > 0) {
    const seg = haversine(points[i - 1], points[i]);
    if (seg <= 0) {
      i -= 1;
      continue;
    }
    if (seg >= remaining) {
      const pos = interpolate(points[i], points[i - 1], remaining / seg);
      return { lat: pos.lat, lon: pos.lon, idx: i - 1 };
    }
    remaining -= seg;
    i -= 1;
  }
  return { lat: points[0].lat, lon: points[0].lon, idx: 0 };
}

export function totalDistance(points: RoutePoint[]): number {
  let d = 0;
  for (let i = 1; i < points.length; i++) {
    d += haversine(points[i - 1], points[i]);
  }
  return d;
}

/** Metres along the track to each point index. */
export function cumulativeDistances(points: RoutePoint[]): number[] {
  const out = [0];
  for (let i = 1; i < points.length; i++) {
    out.push(out[i - 1] + haversine(points[i - 1], points[i]));
  }
  return out;
}

/** Metres along the track to a lat/lon (nearest track point, or idx when present). */
export function distanceAlongRoute(
  points: RoutePoint[],
  target: { lat: number; lon: number; idx?: number }
): number {
  const cum = cumulativeDistances(points);
  if (!cum.length) return 0;
  if (target.idx != null && target.idx >= 0 && target.idx < cum.length) {
    // idx: 0 was used as a dummy on reimport, which pinned every turn at mile 0.
    // Only trust the index when the turn is actually near that track point.
    if (haversine(points[target.idx], target) < 50) return cum[target.idx];
  }
  let best = 0;
  let bestGap = Infinity;
  for (let i = 0; i < points.length; i++) {
    const gap = haversine(points[i], target);
    if (gap < bestGap) {
      bestGap = gap;
      best = cum[i];
    }
  }
  return best;
}
