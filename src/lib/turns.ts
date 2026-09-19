import type { RoutePoint, DetectedTurn, RouteSettings } from './types';
import { bearing, pointBefore } from './geo';

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
): DetectedTurn['grade'] {
  // 6 = wide sweeper … 1 = 180° hairpin
  if (angle < thresholds[6]) return 6;
  if (angle < thresholds[5]) return 5;
  if (angle < thresholds[4]) return 4;
  if (angle < thresholds[3]) return 3;
  if (angle < thresholds[2]) return 2;
  return 1;
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
      let j = i + 1;

      while (j < bearings.length) {
        let d = bearings[j] - bearings[j - 1];
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        if (Math.sign(d) !== Math.sign(cumAngle) || Math.abs(d) < 2) break;
        cumAngle += d;
        j++;
      }

      if (Math.abs(cumAngle) >= settings.minTurnAngle) {
        const entryIdx = Math.min(startIdx, points.length - 1);
        const minIdx = turns.length ? (turns[turns.length - 1].idx ?? 0) + 1 : 0;
        const placed = pointBefore(points, entryIdx, (settings.warnBeforeFeet ?? 165) * 0.3048);
        const idx = Math.max(placed.idx, minIdx);
        const at = idx === placed.idx ? placed : points[Math.min(idx, points.length - 1)];
        turns.push({
          lat: at.lat,
          lon: at.lon,
          angle: Math.abs(cumAngle),
          direction: cumAngle > 0 ? 'right' : 'left',
          grade: classifySharpness(Math.abs(cumAngle), settings.thresholds),
          idx,
        });
        i = j + 2;
        continue;
      }
    }
    i++;
  }
  return turns;
}
