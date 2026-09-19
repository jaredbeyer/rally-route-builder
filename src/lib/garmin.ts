import type { DetectedTurn, RoutePoint, TurnGrade } from './types';
import { parseGrade, turnCode } from './types';
import { distanceAlongRoute } from './geo';

/** Official Garmin Tread / Explore waypoint symbol names (JaVaWa list). */
export function garminTurnSymbol(direction: 'left' | 'right', _grade?: TurnGrade): string {
  return direction === 'left' ? 'Arrow, Left' : 'Arrow, Right';
}

export function garminMileSymbol(): string {
  return 'Flag, Blue';
}

const EMOJI_TO_GARMIN: Record<string, string> = {
  '📍': 'Pin, Blue',
  '🏁': 'Flag, Red',
  '⛽': 'Gas Station',
  '🔧': 'Car Repair',
  '⚠️': 'Danger Area',
  '🅿️': 'Parking Area',
  '💧': 'Drinking Water',
  '🏕️': 'Campground',
  '🚩': 'Flag, Red',
  '⭐': 'star',
  '❌': 'Circle with X',
  '🔴': 'Pin, Red',
  '🟡': 'Pin, Yellow',
  '🟢': 'Pin, Green',
  '🔵': 'Pin, Blue',
  '🟣': 'Pin, Blue',
  '🏔️': 'Summit',
  '🌊': 'Swimming Area',
  '🌲': 'Forest',
  '🪨': 'rocks',
  '🦌': 'deertracks',
  '🔥': 'Camp Fire',
  '💀': 'Skull and Crossbones',
  '🚧': 'Alert',
  '🏗️': 'Building',
  '🛑': 'Stop Sign',
  '↗️': 'Arrow, Up Right',
  '↘️': 'Arrow, Down Right',
  '🔀': 'Street Intersection',
  '🎯': 'Pin, Red',
  '🏠': 'Residence',
  '🏥': 'Medical Facility',
  '📡': 'Radio Beacon',
  '🚰': 'Drinking Water',
  '🔋': 'Information',
  '🧭': 'Information',
  '🗻': 'Summit',
  '🛤️': 'Railway',
  '🚜': 'ATV',
  '📏': 'Flag, Blue',
};

export function garminWaypointSymbol(icon: string): string {
  if (!icon) return 'Pin, Blue';
  if (EMOJI_TO_GARMIN[icon]) return EMOJI_TO_GARMIN[icon];
  // Already a Garmin name (re-export)
  if (/^[A-Za-z][A-Za-z0-9, _-]*$/.test(icon) && !/\p{Emoji}/u.test(icon)) return icon;
  return 'Pin, Blue';
}

export function turnComment(turn: Pick<DetectedTurn, 'grade' | 'direction'>): string {
  return `${turn.grade}_${turn.direction}`;
}

export function parseGarminTurnSymbol(sym: string): { direction: 'left' | 'right'; grade: TurnGrade } | null {
  const s = sym.trim();
  if (/^u[-\s]?turn$/i.test(s)) return { direction: 'left', grade: 1 };

  const arrow = s.match(/^arrow,\s*(down\s+|up\s+)?(left|right)$/i);
  if (arrow) {
    const tilt = (arrow[1] || '').trim().toLowerCase();
    const direction = arrow[2].toLowerCase() as 'left' | 'right';
    const grade: TurnGrade = tilt === 'down' ? 2 : tilt === 'up' ? 6 : 3;
    return { direction, grade };
  }

  const course = s.match(/^(left|right)(?:[_ ](slight|sharp))?$/i);
  if (course) {
    const direction = course[1].toLowerCase() as 'left' | 'right';
    const mod = (course[2] || '').toLowerCase();
    const grade: TurnGrade = mod === 'sharp' ? 2 : mod === 'slight' ? 5 : 3;
    return { direction, grade };
  }

  return null;
}

export function parseTurnWaypoint(
  name: string,
  desc: string,
  sym: string,
  cmt = ''
): Pick<DetectedTurn, 'grade' | 'direction' | 'angle' | 'label'> {
  const nameCode = name.match(/\b([LR])([1-6])\b/i);
  const descCode = desc.match(/\b([LR])([1-6])\b/i);
  const descDir = desc.match(/\b(left|right)\b/i);
  const stored = `${cmt} ${sym}`.match(/\b(?:(\d)|flat|slight|moderate|sharp|hairpin)_(left|right)\b/i);
  const garmin = parseGarminTurnSymbol(sym);

  let direction: 'left' | 'right' = 'left';
  if (nameCode) direction = nameCode[1].toUpperCase() === 'R' ? 'right' : 'left';
  else if (stored) direction = stored[2].toLowerCase() as 'left' | 'right';
  else if (garmin) direction = garmin.direction;
  else if (descDir) direction = descDir[1].toLowerCase() as 'left' | 'right';

  let grade: TurnGrade = 3;
  if (nameCode) grade = parseGrade(nameCode[2]);
  else if (descCode) grade = parseGrade(descCode[2]);
  else if (stored?.[1]) grade = parseGrade(stored[1]);
  else if (stored) grade = parseGrade(stored[0].split('_')[0]);
  else if (garmin) grade = garmin.grade;

  const angleMatch = desc.match(/([\d.]+)\s*degrees/i) || name.match(/(\d+)\s*deg/i);
  const angle = angleMatch ? parseFloat(angleMatch[1]) : 90;

  const autoPattern = /^(?:[LR][1-6](?:\s+\d+(?:\.\d+)?)?(?:\s*deg)?|(?:FLAT|SLIGHT|MODERATE|SHARP|HAIRPIN)\s+[LR](?:\s+\d+deg)?)$/i;
  const label = autoPattern.test(name) ? '' : name && name !== turnCode(direction, grade) ? name : '';

  return { grade, direction, angle, label };
}

function metersToDisplay(meters: number, unit: 'miles' | 'km', decimals: number): string {
  const value = unit === 'km' ? meters / 1000 : meters / 1609.344;
  return value.toFixed(decimals);
}

/**
 * Tread/BaseCamp require unique waypoint names and append " 1", " 2" when they collide.
 * Use the pace-note code plus mile/km along the route so names stay unique without a serial.
 */
export function uniqueTurnExportNames(
  turns: DetectedTurn[],
  routePoints: RoutePoint[],
  unit: 'miles' | 'km' = 'miles',
  reservedNames: string[] = []
): string[] {
  const used = new Set<string>(reservedNames.filter(Boolean));
  return turns.map((turn) => {
    if (turn.label?.trim()) {
      let name = turn.label.trim();
      if (!used.has(name)) {
        used.add(name);
        return name;
      }
    }
    const code = turnCode(turn.direction, turn.grade);
    const meters = distanceAlongRoute(routePoints, turn);
    let decimals = 1;
    let name = `${code} ${metersToDisplay(meters, unit, decimals)}`;
    while (used.has(name) && decimals < 4) {
      decimals += 1;
      name = `${code} ${metersToDisplay(meters, unit, decimals)}`;
    }
    if (used.has(name)) name = `${code} ${metersToDisplay(meters, unit, 4)}x`;
    used.add(name);
    return name;
  });
}
