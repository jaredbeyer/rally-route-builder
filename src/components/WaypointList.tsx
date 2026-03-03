'use client';

import type { Waypoint } from '@/lib/types';

interface WaypointListProps {
  waypoints: Waypoint[];
  onEdit: (idx: number) => void;
  onToggle: (idx: number, enabled: boolean) => void;
  onDelete: (idx: number) => void;
  onZoom: (idx: number) => void;
}

export default function WaypointList({ waypoints, onEdit, onToggle, onDelete, onZoom }: WaypointListProps) {
  if (!waypoints.length) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 16px', color: 'var(--text-dim)' }}>
        <div style={{ fontSize: '2rem', marginBottom: 8, opacity: 0.4 }}>📌</div>
        <p>No waypoints yet — click the map or press &quot;+ Add&quot;</p>
      </div>
    );
  }

  return (
    <div style={{ maxHeight: 300, overflowY: 'auto' }}>
      {waypoints.map((wp, i) => (
        <div
          key={i}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 8px', borderRadius: 4, marginBottom: 3,
            background: 'rgba(255,255,255,0.03)', fontSize: '0.83rem',
            opacity: wp.enabled ? 1 : 0.4, transition: 'all 0.15s',
          }}
        >
          <div
            onClick={() => onEdit(i)}
            title="Edit icon & details"
            style={{
              width: 26, height: 26, borderRadius: 4, border: '1px solid #444',
              background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: '0.95rem', flexShrink: 0,
            }}
          >{wp.icon}</div>

          <div
            onClick={() => onEdit(i)}
            style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
            title={`Click to edit — ${wp.name} (${wp.lat.toFixed(4)}, ${wp.lon.toFixed(4)})`}
          >{wp.name}</div>

          <div onClick={() => onZoom(i)} title="Zoom to" style={{ cursor: 'pointer', padding: '0 2px', color: '#666', fontSize: '0.75rem' }}>🔍</div>

          <label style={{ position: 'relative', width: 36, height: 20, flexShrink: 0 }}>
            <input
              type="checkbox"
              checked={wp.enabled}
              onChange={(e) => onToggle(i, e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span className="slider" style={{
              position: 'absolute', inset: 0,
              background: wp.enabled ? 'var(--green)' : '#444',
              borderRadius: 20, cursor: 'pointer', transition: '0.2s',
            }}>
              <span style={{
                content: '', position: 'absolute', width: 16, height: 16, borderRadius: '50%',
                background: wp.enabled ? '#fff' : '#999',
                left: wp.enabled ? 18 : 2, top: 2, transition: '0.2s',
              }} />
            </span>
          </label>

          <div onClick={() => onDelete(i)} title="Delete" style={{ cursor: 'pointer', padding: '0 2px', color: '#666', fontSize: '0.75rem' }}>✕</div>
        </div>
      ))}
    </div>
  );
}
