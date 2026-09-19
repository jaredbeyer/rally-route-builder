import type { RoutePoint, DetectedTurn, MileMarker, Waypoint } from './types';
import { parseGrade } from './types';
import { formatMileMarkerLabel, isExportedMileMarker, isStockMileLabel, parseAutoMileExportName, parseTurnWaypoint } from './garmin';
import { haversine } from './geo';

export interface ParseResult {
  routePoints: RoutePoint[];
  detectedTurns: DetectedTurn[];
  mileMarkers: MileMarker[];
  waypoints: Waypoint[];
  isReimport: boolean;
}

function gpxElements(root: Document | Element, localName: string): Element[] {
  const out: Element[] = [];
  const seen = new Set<Element>();
  const add = (list: ArrayLike<Element>) => {
    for (let i = 0; i < list.length; i++) {
      const el = list[i];
      if (!seen.has(el)) {
        seen.add(el);
        out.push(el);
      }
    }
  };
  add(root.getElementsByTagName(localName));
  add(root.getElementsByTagNameNS('*', localName));
  add(root.querySelectorAll(localName));
  return out;
}

function gpxChildText(el: Element, localName: string): string {
  return gpxElements(el, localName)[0]?.textContent || '';
}

function isOurTurnWaypoint(type: string): boolean {
  return (type || '').trim() === 'turn';
}

function isOurMileWaypoint(type: string, desc: string, cmt: string): boolean {
  if ((type || '').trim() === 'mile_marker') return true;
  if (/^mile_marker$/i.test((cmt || '').trim())) return true;
  if (/^Mile Marker:/i.test(desc || '')) return true;
  return false;
}

export function parseGPX(xmlString: string): ParseResult {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlString, 'text/xml');

  const routePoints: RoutePoint[] = [];
  const waypoints: Waypoint[] = [];
  const detectedTurns: DetectedTurn[] = [];
  const mileMarkers: MileMarker[] = [];
  let isReimport = false;

  // Track points
  const trkpts = gpxElements(xml, 'trkpt');
  const rtepts = gpxElements(xml, 'rtept');
  const pts = trkpts.length ? trkpts : rtepts;
  pts.forEach((pt) => {
    routePoints.push({
      lat: parseFloat(pt.getAttribute('lat') || '0'),
      lon: parseFloat(pt.getAttribute('lon') || '0'),
      ele: pt.querySelector('ele') ? parseFloat(pt.querySelector('ele')!.textContent || '0') : null,
      time: pt.querySelector('time') ? pt.querySelector('time')!.textContent : null,
    });
  });

  // Waypoints — sort into categories by <type> tag
  gpxElements(xml, 'wpt').forEach((wpt) => {
    const lat = parseFloat(wpt.getAttribute('lat') || '0');
    const lon = parseFloat(wpt.getAttribute('lon') || '0');
    const name = gpxChildText(wpt, 'name') || 'Unnamed';
    const desc = gpxChildText(wpt, 'desc');
    const sym = gpxChildText(wpt, 'sym');
    const cmt = gpxChildText(wpt, 'cmt');
    const type = gpxChildText(wpt, 'type');

    if (type === 'turn') {
      isReimport = true;
      const parsed = parseTurnWaypoint(name, desc, sym, cmt);
      detectedTurns.push({ lat, lon, ...parsed });
    } else if (isExportedMileMarker(type, desc, cmt, name)) {
      isReimport = true;
      // Restore custom icon from comment or a leftover emoji <sym>
      const mmIcon = [cmt, sym].find((s) => s && s !== 'mile_marker' && /\p{Emoji}/u.test(s)) || '📏';
      // Extract original distance label from desc like "Mile Marker: 1.0 mi"
      const distMatch = desc.match(/Mile Marker:\s*(.+)/i);
      const autoMile = parseAutoMileExportName(name);
      let distLabel = distMatch ? distMatch[1].trim() : '';
      if (!distLabel && autoMile) {
        distLabel = `${autoMile.value} ${autoMile.unit}`;
      }
      if (!distLabel) distLabel = name;
      const distance = parseFloat(distLabel) || parseFloat(autoMile?.value || '') || 0;
      const unit = /km/i.test(distLabel) || autoMile?.unit === 'km' ? 'km' : 'miles';
      const label = formatMileMarkerLabel(distance, unit);
      const customLabel = !isStockMileLabel(name) && name !== label ? name : '';
      mileMarkers.push({ lat, lon, distance, label, icon: mmIcon, customLabel });
    } else {
      const icon = [cmt, sym].find((s) => s && /\p{Emoji}/u.test(s)) || '📍';
      waypoints.push({
        name,
        lat,
        lon,
        ele: gpxChildText(wpt, 'ele') ? parseFloat(gpxChildText(wpt, 'ele')) : null,
        desc,
        icon,
        enabled: true,
      });
    }
  });

  return { routePoints, detectedTurns, mileMarkers, waypoints, isReimport };
}

export function parseKML(xmlString: string): ParseResult {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlString, 'text/xml');

  const routePoints: RoutePoint[] = [];
  const waypoints: Waypoint[] = [];
  const detectedTurns: DetectedTurn[] = [];
  const mileMarkers: MileMarker[] = [];
  let isReimport = false;

  // Find the route LineString
  const lineStrings = xml.querySelectorAll('LineString coordinates');
  let longestCoords = '';
  lineStrings.forEach((c) => {
    if (c.textContent!.trim().length > longestCoords.length) longestCoords = c.textContent!.trim();
  });
  if (!longestCoords) {
    xml.querySelectorAll('coordinates').forEach((c) => {
      if (c.textContent!.trim().length > longestCoords.length) longestCoords = c.textContent!.trim();
    });
  }
  if (longestCoords) {
    longestCoords.split(/\s+/).forEach((triplet) => {
      const parts = triplet.split(',');
      if (parts.length >= 2) {
        routePoints.push({
          lat: parseFloat(parts[1]),
          lon: parseFloat(parts[0]),
          ele: parts[2] ? parseFloat(parts[2]) : null,
        });
      }
    });
  }

  // Detect folder-based structure from our exports
  const folders = xml.querySelectorAll('Folder');
  const folderMap: Record<string, Element> = {};
  folders.forEach((f) => {
    const nameEl = f.querySelector(':scope > name');
    if (nameEl) folderMap[nameEl.textContent!.trim()] = f;
  });

  if (folderMap['Turns']) {
    isReimport = true;
    folderMap['Turns'].querySelectorAll('Placemark').forEach((pm) => {
      const point = pm.querySelector('Point coordinates');
      if (!point) return;
      const parts = point.textContent!.trim().split(',');
      const lat = parseFloat(parts[1]);
      const lon = parseFloat(parts[0]);
      const name = pm.querySelector('name')?.textContent || '';
      const styleUrl = (pm.querySelector('styleUrl')?.textContent || '').replace('#', '');
      const styleParts = styleUrl.split('_');
      const grade = parseGrade(styleParts[0]);
      const direction: 'left' | 'right' = styleParts[1] === 'right' ? 'right' : 'left';
      const angleMatch = name.match(/(\d+)deg/i);
      const angle = angleMatch ? parseFloat(angleMatch[1]) : 90;
      const autoPattern = /^(?:[LR][1-6]|(?:FLAT|SLIGHT|MODERATE|SHARP|HAIRPIN)\s+[LR])(?:\s+\d+deg)?$/i;
      const label = autoPattern.test(name) ? '' : name;
      detectedTurns.push({ lat, lon, angle, direction, grade, label });
    });
  }

  if (folderMap['Mile Markers']) {
    isReimport = true;
    folderMap['Mile Markers'].querySelectorAll('Placemark').forEach((pm) => {
      const point = pm.querySelector('Point coordinates');
      if (!point) return;
      const parts = point.textContent!.trim().split(',');
      const rawName = pm.querySelector('name')?.textContent || '0';
      const desc = pm.querySelector('description')?.textContent || '';
      // Extract icon from name prefix if present
      const emojiMatch = rawName.match(/^(\p{Emoji})\s*(.*)/u);
      const mmIcon = emojiMatch ? emojiMatch[1] : '📏';
      const displayName = emojiMatch ? emojiMatch[2] || '0' : rawName;
      // Extract distance label from description
      const distMatch = desc.match(/Distance:\s*(.+?)(?:,|$)/i);
      const distLabel = distMatch ? distMatch[1].trim() : displayName;
      const autoMile = parseAutoMileExportName(displayName);
      const distance = parseFloat(distLabel) || parseFloat(autoMile?.value || '') || 0;
      const unit = /km/i.test(distLabel) || autoMile?.unit === 'km' ? 'km' : 'miles';
      const label = formatMileMarkerLabel(distance, unit);
      const customLabel = !isStockMileLabel(displayName) && displayName !== label ? displayName : '';
      mileMarkers.push({
        lat: parseFloat(parts[1]),
        lon: parseFloat(parts[0]),
        distance,
        label,
        icon: mmIcon,
        customLabel,
      });
    });
  }

  if (folderMap['Waypoints']) {
    folderMap['Waypoints'].querySelectorAll('Placemark').forEach((pm) => {
      const point = pm.querySelector('Point coordinates');
      if (!point) return;
      const parts = point.textContent!.trim().split(',');
      const rawName = pm.querySelector('name')?.textContent || 'Unnamed';
      const desc = pm.querySelector('description')?.textContent || '';
      const emojiMatch = rawName.match(/^(\p{Emoji})\s*(.*)/u);
      const icon = emojiMatch ? emojiMatch[1] : '📍';
      const name = emojiMatch ? emojiMatch[2] || 'Unnamed' : rawName;
      waypoints.push({
        name,
        lat: parseFloat(parts[1]),
        lon: parseFloat(parts[0]),
        ele: parts[2] ? parseFloat(parts[2]) : null,
        desc,
        icon,
        enabled: true,
      });
    });
  } else {
    xml.querySelectorAll('Placemark').forEach((pm) => {
      const point = pm.querySelector('Point');
      if (point) {
        const c = point.querySelector('coordinates');
        if (c) {
          const parts = c.textContent!.trim().split(',');
          waypoints.push({
            name: pm.querySelector('name')?.textContent || 'Unnamed',
            lat: parseFloat(parts[1]),
            lon: parseFloat(parts[0]),
            ele: parts[2] ? parseFloat(parts[2]) : null,
            desc: pm.querySelector('description')?.textContent || '',
            icon: '📍',
            enabled: true,
          });
        }
      }
    });
  }

  return { routePoints, detectedTurns, mileMarkers, waypoints, isReimport };
}

function waypointFromGpxWpt(wpt: Element): Waypoint | null {
  const lat = parseFloat(wpt.getAttribute('lat') || '');
  const lon = parseFloat(wpt.getAttribute('lon') || '');
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const name = gpxChildText(wpt, 'name') || 'Unnamed';
  const desc = gpxChildText(wpt, 'desc');
  const sym = gpxChildText(wpt, 'sym');
  const cmt = gpxChildText(wpt, 'cmt');
  const icon = [cmt, sym].find((s) => s && /\p{Emoji}/u.test(s)) || '📍';
  return {
    name,
    lat,
    lon,
    ele: gpxChildText(wpt, 'ele') ? parseFloat(gpxChildText(wpt, 'ele')) : null,
    desc,
    icon,
    enabled: true,
  };
}

/** Read only marks/waypoints from a GPX or KML. Ignores track, turns, and mile markers. */
export function parseMarksOnly(xmlString: string, filename: string): Waypoint[] {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'kml') return parseKML(xmlString).waypoints;

  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlString, 'text/xml');
  const marks: Waypoint[] = [];
  gpxElements(xml, 'wpt').forEach((wpt) => {
    const type = gpxChildText(wpt, 'type');
    const desc = gpxChildText(wpt, 'desc');
    const cmt = gpxChildText(wpt, 'cmt');
    if (isOurTurnWaypoint(type) || isOurMileWaypoint(type, desc, cmt)) return;
    const wp = waypointFromGpxWpt(wpt);
    if (wp) marks.push(wp);
  });
  return marks;
}

export function mergeWaypoints(
  existing: Waypoint[],
  incoming: Waypoint[]
): { waypoints: Waypoint[]; added: number; skipped: number } {
  const waypoints = [...existing];
  let added = 0;
  let skipped = 0;
  for (const wp of incoming) {
    const dup = waypoints.some((e) => haversine(e, wp) < 15);
    if (dup) {
      skipped += 1;
      continue;
    }
    waypoints.push(wp);
    added += 1;
  }
  return { waypoints, added, skipped };
}
