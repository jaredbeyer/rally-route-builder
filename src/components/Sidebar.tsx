'use client';

import { useRef } from 'react';
import type { RoutePoint, DetectedTurn, MileMarker, Waypoint, RouteSettings } from '@/lib/types';
import { TURN_COLORS } from '@/lib/types';
import { totalDistance } from '@/lib/geo';
import TurnList from './TurnList';
import WaypointList from './WaypointList';

interface SidebarProps {
  // State
  routePoints: RoutePoint[];
  detectedTurns: DetectedTurn[];
  mileMarkers: MileMarker[];
  waypoints: Waypoint[];
  settings: RouteSettings;
  fileName: string | null;
  saving: boolean;
  lastSaved: string | null;
  // Callbacks
  onFileLoad: (content: string, name: string) => void;
  onResetFile: () => void;
  onSettingsChange: (s: Partial<RouteSettings>) => void;
  onReprocessTurns: () => void;
  onForceRedetect: () => void;
  onReprocessMiles: () => void;
  onEditTurn: (idx: number) => void;
  onDeleteTurn: (idx: number) => void;
  onZoomTurn: (idx: number) => void;
  onEditWaypoint: (idx: number) => void;
  onToggleWaypoint: (idx: number, enabled: boolean) => void;
  onDeleteWaypoint: (idx: number) => void;
  onZoomWaypoint: (idx: number) => void;
  onToggleAllWaypoints: (on: boolean) => void;
  onAddWaypoint: () => void;
  onEditMileMarker: (idx: number) => void;
  onDeleteMileMarker: (idx: number) => void;
  onZoomMileMarker: (idx: number) => void;
  onExportGPX: () => void;
  onExportKML: () => void;
  onSave: () => void;
}

export default function Sidebar(props: SidebarProps) {
  const {
    routePoints, detectedTurns, mileMarkers, waypoints, settings, fileName, saving, lastSaved,
    onFileLoad, onResetFile, onSettingsChange, onReprocessTurns, onForceRedetect,
    onReprocessMiles, onEditTurn, onDeleteTurn, onZoomTurn,
    onEditWaypoint, onToggleWaypoint, onDeleteWaypoint, onZoomWaypoint,
    onToggleAllWaypoints, onAddWaypoint,
    onEditMileMarker, onDeleteMileMarker, onZoomMileMarker,
    onExportGPX, onExportKML, onSave,
  } = props;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasRoute = routePoints.length > 0;

  const handleFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['gpx', 'kml'].includes(ext || '')) { alert('Please load a .gpx or .kml file'); return; }
    const reader = new FileReader();
    reader.onload = (e) => onFileLoad(e.target?.result as string, file.name);
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  };

  // Stats
  const dist = hasRoute ? totalDistance(routePoints) : 0;
  const miles = (dist / 1609.344).toFixed(1);
  const km = (dist / 1000).toFixed(1);
  const leftTurns = detectedTurns.filter((t) => t.direction === 'left').length;
  const rightTurns = detectedTurns.filter((t) => t.direction === 'right').length;
  const enabledWps = waypoints.filter((w) => w.enabled).length;

  return (
    <div style={{ background: 'var(--surface)', overflowY: 'auto', borderRight: '1px solid #333', height: '100%' }}>
      {/* File Upload Section */}
      <div className="section" style={{ padding: 16, borderBottom: '1px solid #333' }}>
        <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--accent)', marginBottom: 10, fontWeight: 600 }}>📂 Load Route File</div>
        {!fileName ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).classList.add('drag-over'); }}
            onDragLeave={(e) => (e.currentTarget as HTMLElement).classList.remove('drag-over')}
            onDrop={handleDrop}
            style={{ border: '2px dashed #555', borderRadius: 'var(--radius)', padding: '28px 16px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>📍</div>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Drop GPX or KML file here</p>
            <div style={{ fontSize: '0.75rem', color: '#666', marginTop: 4 }}>Supports .gpx and .kml files</div>
          </div>
        ) : (
          <div style={{ background: 'rgba(78,205,196,0.1)', border: '1px solid var(--green)', borderRadius: 'var(--radius)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ color: 'var(--green)', fontSize: '1.2rem' }}>✓</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{fileName}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{routePoints.length} track points, {waypoints.length} waypoints</div>
            </div>
            <button onClick={onResetFile} style={{ background: 'none', border: '1px solid #555', color: 'var(--text-dim)', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: '0.75rem' }}>✕</button>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept=".gpx,.kml" style={{ display: 'none' }} onChange={(e) => { if (e.target.files?.length) handleFile(e.target.files[0]); }} />
      </div>

      {/* Stats */}
      {hasRoute && (
        <div className="section" style={{ padding: 16, borderBottom: '1px solid #333' }}>
          <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--accent)', marginBottom: 10, fontWeight: 600 }}>📊 Route Stats</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <div className="stat" style={{ background: 'var(--bg)', padding: '6px 12px', borderRadius: 4, fontSize: '0.8rem' }}>
              <span style={{ fontWeight: 700, color: 'var(--accent2)' }}>{miles}</span> mi / <span style={{ fontWeight: 700, color: 'var(--accent2)' }}>{km}</span> km
            </div>
            <div className="stat" style={{ background: 'var(--bg)', padding: '6px 12px', borderRadius: 4, fontSize: '0.8rem' }}>
              ← <span style={{ fontWeight: 700, color: 'var(--accent2)' }}>{leftTurns}</span> | <span style={{ fontWeight: 700, color: 'var(--accent2)' }}>{rightTurns}</span> →
            </div>
            <div className="stat" style={{ background: 'var(--bg)', padding: '6px 12px', borderRadius: 4, fontSize: '0.8rem' }}>
              <span style={{ fontWeight: 700, color: 'var(--accent2)' }}>{mileMarkers.length}</span> markers
            </div>
            <div className="stat" style={{ background: 'var(--bg)', padding: '6px 12px', borderRadius: 4, fontSize: '0.8rem' }}>
              <span style={{ fontWeight: 700, color: 'var(--accent2)' }}>{enabledWps}</span>/{waypoints.length} wpts
            </div>
          </div>
        </div>
      )}

      {/* Turn Detection */}
      {hasRoute && (
        <div className="section" style={{ padding: 16, borderBottom: '1px solid #333' }}>
          <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--accent)', marginBottom: 10, fontWeight: 600 }}>🔄 Turn Detection</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Smoothing</label>
            <input type="number" value={settings.smoothWindow} min={1} max={20}
              onChange={(e) => onSettingsChange({ smoothWindow: parseInt(e.target.value) || 5 })}
              style={{ width: 70, background: 'var(--bg)', border: '1px solid #444', color: 'var(--text)', padding: '6px 8px', borderRadius: 4, fontSize: '0.9rem' }} />
            <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>pts</label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Min Angle</label>
            <input type="number" value={settings.minTurnAngle} min={5} max={90}
              onChange={(e) => onSettingsChange({ minTurnAngle: parseFloat(e.target.value) || 20 })}
              style={{ width: 70, background: 'var(--bg)', border: '1px solid #444', color: 'var(--text)', padding: '6px 8px', borderRadius: 4, fontSize: '0.9rem' }} />
            <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>°</label>
          </div>

          {/* Thresholds */}
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--accent)', marginBottom: 6, fontWeight: 600 }}>Sharpness Thresholds</div>
            {[
              { key: 'flat' as const, color: '#4ecdc4', label: 'Flat <' },
              { key: 'slight' as const, color: '#f5a623', label: 'Slight <' },
              { key: 'moderate' as const, color: '#e8751a', label: 'Moderate <' },
              { key: 'sharp' as const, color: '#e94560', label: 'Sharp <' },
            ].map(({ key, color, label }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: '0.78rem' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ color: 'var(--text-dim)' }}>{label}</span>
                <input type="number" value={settings.thresholds[key]} min={5} max={180}
                  onChange={(e) => onSettingsChange({ thresholds: { ...settings.thresholds, [key]: parseFloat(e.target.value) || settings.thresholds[key] } })}
                  style={{ width: 50, background: 'var(--bg)', border: '1px solid #444', color: 'var(--text)', padding: '3px 6px', borderRadius: 3, fontSize: '0.78rem', textAlign: 'center' }} />
                <span style={{ color: 'var(--text-dim)' }}>°</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontSize: '0.78rem' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#9b59b6', flexShrink: 0 }} />
              <span style={{ color: 'var(--text-dim)' }}>Hairpin ≥ {settings.thresholds.sharp}°</span>
            </div>
          </div>

          <button className="btn btn-secondary btn-block btn-sm" style={{ marginTop: 8 }} onClick={onReprocessTurns}>🔄 Recalculate Turns</button>
          <button className="btn btn-secondary btn-block btn-sm" style={{ marginTop: 4, fontSize: '0.7rem', opacity: 0.7 }} onClick={onForceRedetect} title="Discard all manual turn edits and re-run auto-detection">⚡ Re-detect All (reset manual edits)</button>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--accent)', marginBottom: 6, fontWeight: 600 }}>
              Detected Turns <span style={{ color: 'var(--text-dim)' }}>({detectedTurns.length})</span>
            </div>
            <TurnList turns={detectedTurns} onZoom={onZoomTurn} onEdit={onEditTurn} onDelete={onDeleteTurn} />
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {Object.entries(TURN_COLORS).map(([name, color]) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', padding: '4px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.03)' }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  {name.charAt(0).toUpperCase() + name.slice(1)}
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', padding: '4px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#3498db', flexShrink: 0 }} />
                Mile Mkr
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mile Markers */}
      {hasRoute && (
        <div className="section" style={{ padding: 16, borderBottom: '1px solid #333' }}>
          <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--accent)', marginBottom: 10, fontWeight: 600 }}>📏 Mile Markers</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Every</label>
            <input type="number" value={settings.mileInterval} min={0.1} max={100} step={0.1}
              onChange={(e) => onSettingsChange({ mileInterval: parseFloat(e.target.value) || 1 })}
              style={{ width: 70, background: 'var(--bg)', border: '1px solid #444', color: 'var(--text)', padding: '6px 8px', borderRadius: 4, fontSize: '0.9rem' }} />
            <select value={settings.mileUnit}
              onChange={(e) => onSettingsChange({ mileUnit: e.target.value as 'miles' | 'km' })}
              style={{ background: 'var(--bg)', border: '1px solid #444', color: 'var(--text)', padding: '6px 8px', borderRadius: 4, fontSize: '0.85rem' }}>
              <option value="miles">miles</option>
              <option value="km">km</option>
            </select>
          </div>
          <button className="btn btn-secondary btn-block btn-sm" onClick={onReprocessMiles}>📏 Recalculate</button>

          {/* Mile Marker List */}
          {mileMarkers.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--accent)', marginBottom: 6, fontWeight: 600 }}>
                Markers <span style={{ color: 'var(--text-dim)' }}>({mileMarkers.length})</span>
              </div>
              <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                {mileMarkers.map((mm, i) => (
                  <div
                    key={i}
                    onClick={() => onZoomMileMarker(i)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 6px', borderRadius: 4, marginBottom: 2,
                      background: 'rgba(255,255,255,0.03)', fontSize: '0.78rem', cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: '0.9rem', flexShrink: 0 }}>{mm.icon || '📏'}</span>
                    <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {mm.customLabel || mm.label}
                    </div>
                    <div
                      onClick={(e) => { e.stopPropagation(); onEditMileMarker(i); }}
                      title="Edit"
                      style={{ color: 'var(--blue)', cursor: 'pointer', padding: '0 4px' }}
                    >✏️</div>
                    <div
                      onClick={(e) => { e.stopPropagation(); onDeleteMileMarker(i); }}
                      title="Remove"
                      style={{ color: '#666', cursor: 'pointer', padding: '0 4px' }}
                    >✕</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Waypoints */}
      {hasRoute && (
        <div className="section" style={{ padding: 16, borderBottom: '1px solid #333' }}>
          <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--accent)', marginBottom: 10, fontWeight: 600 }}>
            📌 Waypoints <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>({waypoints.length})</span>
          </div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => onToggleAllWaypoints(true)}>✓ All On</button>
            <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => onToggleAllWaypoints(false)}>✕ All Off</button>
            <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={onAddWaypoint} title="Add a waypoint manually">+ Add</button>
          </div>
          <WaypointList waypoints={waypoints} onEdit={onEditWaypoint} onToggle={onToggleWaypoint} onDelete={onDeleteWaypoint} onZoom={onZoomWaypoint} />
        </div>
      )}

      {/* Export & Save */}
      {hasRoute && (
        <div className="section" style={{ padding: 16, borderBottom: '1px solid #333' }}>
          <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: 1, color: 'var(--accent)', marginBottom: 10, fontWeight: 600 }}>💾 Export & Save</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button className="btn btn-success" style={{ flex: 1 }} onClick={onExportGPX}>⬇ GPX</button>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={onExportKML}>⬇ KML</button>
          </div>
          <button className="btn btn-secondary btn-block" onClick={onSave} disabled={saving}>
            {saving ? '💾 Saving...' : '💾 Save Project'}
          </button>
          {lastSaved && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 6, textAlign: 'center' }}>
              Last saved: {new Date(lastSaved).toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
