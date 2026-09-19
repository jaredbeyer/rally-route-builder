import type { RoutePoint, MileMarker, RouteSettings } from './types';
import { formatMileMarkerLabel } from './garmin';
import { haversine, interpolate } from './geo';

export function calculateMileMarkers(
  points: RoutePoint[],
  settings: RouteSettings
): MileMarker[] {
  const interval = settings.mileInterval;
  const unit = settings.mileUnit;
  const meterInterval = unit === 'miles' ? interval * 1609.344 : interval * 1000;
  const markers: MileMarker[] = [];
  let dist = 0;
  let nextMarker = meterInterval;

  for (let i = 1; i < points.length; i++) {
    const segDist = haversine(points[i - 1], points[i]);
    const prevDist = dist;
    dist += segDist;

    while (dist >= nextMarker) {
      const fraction = (nextMarker - prevDist) / segDist;
      const pt = interpolate(points[i - 1], points[i], fraction);
      const distance = unit === 'miles' ? nextMarker / 1609.344 : nextMarker / 1000;
      markers.push({
        lat: pt.lat,
        lon: pt.lon,
        distance,
        label: formatMileMarkerLabel(distance, unit),
        icon: '📏',
      });
      nextMarker += meterInterval;
    }
  }

  return markers;
}
