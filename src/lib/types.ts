export interface RoutePoint {
  lat: number;
  lon: number;
  ele?: number | null;
  time?: string | null;
}

/** Rally pace-note grade: 1 = 180° hairpin, 3 = 90°, 6 = flat wide-open sweeper. */
export type TurnGrade = 1 | 2 | 3 | 4 | 5 | 6;

export const TURN_GRADES: TurnGrade[] = [1, 2, 3, 4, 5, 6];

export interface DetectedTurn {
  lat: number;
  lon: number;
  angle: number;
  direction: 'left' | 'right';
  grade: TurnGrade;
  label?: string;
  idx?: number;
}

export interface MileMarker {
  lat: number;
  lon: number;
  distance: number;
  label: string;
  icon?: string;
  customLabel?: string;
}

export interface Waypoint {
  name: string;
  lat: number;
  lon: number;
  ele?: number | null;
  desc?: string;
  icon: string;
  enabled: boolean;
}

/** Upper-bound angles (exclusive) for grades 6→2. Anything steeper is grade 1. */
export interface GradeThresholds {
  6: number;
  5: number;
  4: number;
  3: number;
  2: number;
}

export interface RouteSettings {
  smoothWindow: number;
  minTurnAngle: number;
  thresholds: GradeThresholds;
  mileInterval: number;
  mileUnit: 'miles' | 'km';
}

export interface RouteData {
  routePoints: RoutePoint[];
  detectedTurns: DetectedTurn[];
  mileMarkers: MileMarker[];
  waypoints: Waypoint[];
  settings: RouteSettings;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string;
  original_file_path: string | null;
  original_file_name: string | null;
  route_points: RoutePoint[];
  detected_turns: DetectedTurn[];
  mile_markers: MileMarker[];
  waypoints: Waypoint[];
  settings: RouteSettings;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_SETTINGS: RouteSettings = {
  smoothWindow: 5,
  minTurnAngle: 20,
  // L1=180°, L3=90°, L6=wide sweeper. Bands centered on those anchors.
  thresholds: { 6: 30, 5: 55, 4: 80, 3: 115, 2: 155 },
  mileInterval: 1,
  mileUnit: 'miles',
};

export const TURN_GRADE_META: Record<TurnGrade, { short: string; hint: string; color: string }> = {
  1: { short: '180°', hint: '180° hairpin', color: '#9b59b6' },
  2: { short: 'Tight', hint: 'tight corner', color: '#e94560' },
  3: { short: '90°', hint: '90° corner', color: '#e8751a' },
  4: { short: 'Open', hint: 'open corner', color: '#f5a623' },
  5: { short: 'Fast', hint: 'fast kink', color: '#c9a84c' },
  6: { short: 'Sweeper', hint: 'flat wide-open sweeper', color: '#4ecdc4' },
};

export const TURN_COLORS: Record<TurnGrade, string> = {
  1: TURN_GRADE_META[1].color,
  2: TURN_GRADE_META[2].color,
  3: TURN_GRADE_META[3].color,
  4: TURN_GRADE_META[4].color,
  5: TURN_GRADE_META[5].color,
  6: TURN_GRADE_META[6].color,
};

const OLD_SHARPNESS_TO_GRADE: Record<string, TurnGrade> = {
  hairpin: 1,
  sharp: 2,
  moderate: 3,
  slight: 5,
  flat: 6,
};

export function isTurnGrade(value: unknown): value is TurnGrade {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5 || value === 6;
}

export function parseGrade(raw: unknown): TurnGrade {
  if (isTurnGrade(raw)) return raw;
  if (typeof raw === 'number' && raw >= 1 && raw <= 6) return Math.round(raw) as TurnGrade;
  const s = String(raw ?? '').trim().toLowerCase();
  const asNum = parseInt(s, 10);
  if (asNum >= 1 && asNum <= 6) return asNum as TurnGrade;
  return OLD_SHARPNESS_TO_GRADE[s] ?? 3;
}

export function turnCode(direction: 'left' | 'right', grade: TurnGrade): string {
  return `${direction === 'left' ? 'L' : 'R'}${grade}`;
}

export function formatTurnLabel(
  turn: Pick<DetectedTurn, 'direction' | 'grade' | 'label' | 'angle'>,
  opts?: { withAngle?: boolean }
): string {
  if (turn.label) return turn.label;
  const code = turnCode(turn.direction, turn.grade);
  if (opts?.withAngle) return `${code} ${turn.angle.toFixed(0)}°`;
  return code;
}

export function turnColor(grade: TurnGrade | unknown): string {
  const g = parseGrade(grade);
  return TURN_COLORS[g];
}

type LegacyThresholds = { flat?: number; slight?: number; moderate?: number; sharp?: number };

function readThreshold(t: Record<string, unknown> | GradeThresholds, key: 2 | 3 | 4 | 5 | 6): number | undefined {
  const rec = t as Record<string | number, unknown>;
  const val = rec[key] ?? rec[String(key)];
  return typeof val === 'number' && !Number.isNaN(val) ? val : undefined;
}

export function normalizeSettings(settings?: Partial<RouteSettings> | null): RouteSettings {
  const incoming = settings ?? {};
  const t = (incoming.thresholds ?? {}) as GradeThresholds & LegacyThresholds & Record<string, unknown>;
  const hasGradeKeys = readThreshold(t, 6) !== undefined || readThreshold(t, 2) !== undefined;

  let thresholds: GradeThresholds;
  if (hasGradeKeys) {
    thresholds = {
      6: readThreshold(t, 6) ?? DEFAULT_SETTINGS.thresholds[6],
      5: readThreshold(t, 5) ?? DEFAULT_SETTINGS.thresholds[5],
      4: readThreshold(t, 4) ?? DEFAULT_SETTINGS.thresholds[4],
      3: readThreshold(t, 3) ?? DEFAULT_SETTINGS.thresholds[3],
      2: readThreshold(t, 2) ?? DEFAULT_SETTINGS.thresholds[2],
    };
  } else if (typeof t.flat === 'number') {
    const slight = typeof t.slight === 'number' ? t.slight : 55;
    const moderate = typeof t.moderate === 'number' ? t.moderate : 115;
    thresholds = {
      6: t.flat,
      5: slight,
      4: Math.round((slight + moderate) / 2),
      3: moderate,
      2: typeof t.sharp === 'number' ? t.sharp : 155,
    };
  } else {
    thresholds = { ...DEFAULT_SETTINGS.thresholds };
  }

  return {
    smoothWindow: incoming.smoothWindow ?? DEFAULT_SETTINGS.smoothWindow,
    minTurnAngle: incoming.minTurnAngle ?? DEFAULT_SETTINGS.minTurnAngle,
    thresholds,
    mileInterval: incoming.mileInterval ?? DEFAULT_SETTINGS.mileInterval,
    mileUnit: incoming.mileUnit ?? DEFAULT_SETTINGS.mileUnit,
  };
}

export function normalizeTurn(turn: DetectedTurn | (Omit<DetectedTurn, 'grade'> & { sharpness?: unknown; grade?: unknown })): DetectedTurn {
  const raw = turn as DetectedTurn & { sharpness?: unknown };
  return {
    lat: raw.lat,
    lon: raw.lon,
    angle: raw.angle,
    direction: raw.direction === 'right' ? 'right' : 'left',
    grade: parseGrade(raw.grade ?? raw.sharpness),
    label: raw.label,
    idx: raw.idx,
  };
}

export const MILE_MARKER_ICONS = [
  '📏','🔵','🏁','⛽','🚩','⭐','🔴','🟡','🟢','🟣',
  '🅿️','💧','⚠️','🔧','🚧','🛑','🏕️','🏔️','🪨','🎯',
];

export const WAYPOINT_ICONS = [
  '📍','🏁','⛽','🔧','⚠️','🅿️','💧','🏕️',
  '🚩','⭐','❌','🔴','🟡','🟢','🔵','🟣',
  '🏔️','🌊','🌲','🪨','🦌','🐍','🔥','💀',
  '🚧','🏗️','🛑','↗️','↘️','🔀','🎯','🏠',
  '🏥','📡','🚰','🔋','🧭','🗻','🛤️','🚜',
];
