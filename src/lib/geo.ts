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

export function totalDistance(points: RoutePoint[]): number {
  let d = 0;
  for (let i = 1; i < points.length; i++) {
    d += haversine(points[i - 1], points[i]);
  }
  return d;
}
