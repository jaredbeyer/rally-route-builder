export interface RoutePoint {
  lat: number;
  lon: number;
  ele?: number | null;
  time?: string | null;
}

export interface DetectedTurn {
  lat: number;
  lon: number;
  angle: number;
  direction: 'left' | 'right';
  sharpness: 'flat' | 'slight' | 'moderate' | 'sharp' | 'hairpin';
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

export interface RouteSettings {
  smoothWindow: number;
  minTurnAngle: number;
  thresholds: { flat: number; slight: number; moderate: number; sharp: number };
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
  thresholds: { flat: 30, slight: 60, moderate: 100, sharp: 140 },
  mileInterval: 1,
  mileUnit: 'miles',
};

export const TURN_COLORS: Record<string, string> = {
  flat: '#4ecdc4',
  slight: '#f5a623',
  moderate: '#e8751a',
  sharp: '#e94560',
  hairpin: '#9b59b6',
};

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
