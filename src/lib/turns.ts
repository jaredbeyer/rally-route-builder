import type { RoutePoint, DetectedTurn, RouteSettings } from './types';
import { bearing } from './geo';

export function smoothPoints(points: RoutePoint[], win: number): RoutePoint[] {
  if (win <= 1) return points;
  const half = Math.floor(win / 2);
  return points.map((p, i) => {
    let lat = 0;
    let lon = 0;
    let count = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(points.length - 1, i + half); j++) {
      lat += points[j].lat;
      lon += points[j].lon;
      count++;
    }
    return { ...p, lat: lat / count, lon: lon / count };
  });
}

export function classifySharpness(
  angle: number,
  thresholds: RouteSettings['thresholds']
): DetectedTurn['sharpness'] {
  if (angle < thresholds.flat) return 'flat';
  if (angle < thresholds.slight) return 'slight';
  if (angle < thresholds.moderate) return 'moderate';
  if (angle < thresholds.sharp) return 'sharp';
  return 'hairpin';
}

export function detectTurns(points: RoutePoint[], settings: RouteSettings): DetectedTurn[] {
  const smoothed = smoothPoints(points, settings.smoothWindow);
  const turns: DetectedTurn[] = [];
  const bearings: number[] = [];

  for (let i = 0; i < smoothed.length - 1; i++) {
    bearings.push(bearing(smoothed[i], smoothed[i + 1]));
  }

  let i = 1;
  while (i < bearings.length) {
    let diff = bearings[i] - bearings[i - 1];
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    const cumAngleInit = diff;

    if (Math.abs(diff) >= settings.minTurnAngle * 0.5) {
      const startIdx = i;
      let cumAngle = cumAngleInit;
      let maxCumAbs = Math.abs(cumAngle);
      let maxCumIdx = i;
      let j = i + 1;

      while (j < bearings.length) {
        let d = bearings[j] - bearings[j - 1];
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        if (Math.sign(d) !== Math.sign(cumAngle) || Math.abs(d) < 2) break;
        cumAngle += d;
        if (Math.abs(cumAngle) > maxCumAbs) {
          maxCumAbs = Math.abs(cumAngle);
          maxCumIdx = j;
        }
        j++;
      }

      if (Math.abs(cumAngle) >= settings.minTurnAngle) {
        const midIdx = Math.min(Math.round((startIdx + maxCumIdx) / 2), points.length - 1);
        turns.push({
          lat: points[midIdx].lat,
          lon: points[midIdx].lon,
          angle: Math.abs(cumAngle),
          direction: cumAngle > 0 ? 'right' : 'left',
          sharpness: classifySharpness(Math.abs(cumAngle), settings.thresholds),
          idx: midIdx,
        });
        i = j + 2;
        continue;
      }
    }
    i++;
  }
  return turns;
}
