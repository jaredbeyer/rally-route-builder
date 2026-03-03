import type { RoutePoint, DetectedTurn, MileMarker, Waypoint } from './types';
import { TURN_COLORS } from './types';

export interface ParseResult {
  routePoints: RoutePoint[];
  detectedTurns: DetectedTurn[];
  mileMarkers: MileMarker[];
  waypoints: Waypoint[];
  isReimport: boolean;
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
  const trkpts = xml.querySelectorAll('trkpt');
  const rtepts = xml.querySelectorAll('rtept');
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
  xml.querySelectorAll('wpt').forEach((wpt) => {
    const lat = parseFloat(wpt.getAttribute('lat') || '0');
    const lon = parseFloat(wpt.getAttribute('lon') || '0');
    const name = wpt.querySelector('name')?.textContent || 'Unnamed';
    const desc = wpt.querySelector('desc')?.textContent || '';
    const sym = wpt.querySelector('sym')?.textContent || '';
    const type = wpt.querySelector('type')?.textContent || '';

    if (type === 'turn') {
      isReimport = true;
      const symParts = sym.split('_');
      const sharpness = Object.keys(TURN_COLORS).includes(symParts[0])
        ? (symParts[0] as DetectedTurn['sharpness'])
        : 'moderate';
      const direction: 'left' | 'right' = symParts[1] === 'right' ? 'right' : 'left';
      const angleMatch = desc.match(/([\d.]+)\s*degrees/i);
      const angle = angleMatch ? parseFloat(angleMatch[1]) : 90;
      const autoPattern = /^(FLAT|SLIGHT|MODERATE|SHARP|HAIRPIN)\s+[LR]\s+\d+deg$/i;
      const label = autoPattern.test(name) ? '' : name;
      detectedTurns.push({ lat, lon, angle, direction, sharpness, label, idx: 0 });
    } else if (type === 'mile_marker') {
      isReimport = true;
      // Restore custom icon from sym if it's an emoji (not "mile_marker")
      const mmIcon = sym && sym !== 'mile_marker' && /\p{Emoji}/u.test(sym) ? sym : '📏';
      // Extract original distance label from desc like "Mile Marker: 1.0 mi"
      const distMatch = desc.match(/Mile Marker:\s*(.+)/i);
      const distLabel = distMatch ? distMatch[1].trim() : name;
      // If name differs from distance label, it's a custom label
      const customLabel = name !== distLabel ? name : '';
      mileMarkers.push({ lat, lon, distance: parseFloat(distLabel) || 0, label: distLabel, icon: mmIcon, customLabel });
    } else {
      const icon = sym && /\p{Emoji}/u.test(sym) ? sym : '📍';
      waypoints.push({
        name,
        lat,
        lon,
        ele: wpt.querySelector('ele') ? parseFloat(wpt.querySelector('ele')!.textContent || '0') : null,
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
      const sharpness = Object.keys(TURN_COLORS).includes(styleParts[0])
        ? (styleParts[0] as DetectedTurn['sharpness'])
        : 'moderate';
      const direction: 'left' | 'right' = styleParts[1] === 'right' ? 'right' : 'left';
      const angleMatch = name.match(/(\d+)deg/i);
      const angle = angleMatch ? parseFloat(angleMatch[1]) : 90;
      const autoPattern = /^(FLAT|SLIGHT|MODERATE|SHARP|HAIRPIN)\s+[LR]\s+\d+deg$/i;
      const label = autoPattern.test(name) ? '' : name;
      detectedTurns.push({ lat, lon, angle, direction, sharpness, label, idx: 0 });
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
      const customLabel = displayName !== distLabel ? displayName : '';
      mileMarkers.push({
        lat: parseFloat(parts[1]),
        lon: parseFloat(parts[0]),
        distance: parseFloat(distLabel) || 0,
        label: distLabel,
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
