'use client';

import { useState, useEffect } from 'react';
import type { Waypoint, DetectedTurn, MileMarker } from '@/lib/types';
import { WAYPOINT_ICONS, MILE_MARKER_ICONS } from '@/lib/types';

type ModalMode = 'edit' | 'add' | 'addAtCoords' | 'editTurn' | 'editMileMarker';

interface IconPickerModalProps {
  open: boolean;
  mode: ModalMode;
  // For waypoint modes
  waypoint?: Waypoint | null;
  // For turn mode
  turn?: DetectedTurn | null;
  turnIndex?: number;
  // For mile marker mode
  mileMarker?: MileMarker | null;
  mileMarkerIndex?: number;
  // Coordinates for addAtCoords
  coords?: { lat: number; lon: number } | null;
  onClose: () => void;
  onSaveWaypoint: (wp: Waypoint, index: number | null) => void;
  onDeleteWaypoint: (index: number) => void;
  onSaveTurn: (turn: DetectedTurn, index: number) => void;
  onDeleteTurn: (index: number) => void;
  onSaveMileMarker: (mm: MileMarker, index: number) => void;
  onDeleteMileMarker: (index: number) => void;
  editIndex: number | null;
}

export default function IconPickerModal({
  open, mode, waypoint, turn, turnIndex, mileMarker, mileMarkerIndex, coords, onClose,
  onSaveWaypoint, onDeleteWaypoint, onSaveTurn, onDeleteTurn,
  onSaveMileMarker, onDeleteMileMarker, editIndex,
}: IconPickerModalProps) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [icon, setIcon] = useState('📍');
  const [turnDir, setTurnDir] = useState<'left' | 'right'>('left');
  const [sharpness, setSharpness] = useState<DetectedTurn['sharpness']>('moderate');
  const [angle, setAngle] = useState('90');

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && waypoint) {
      setName(waypoint.name);
      setDesc(waypoint.desc || '');
      setLat(waypoint.lat.toFixed(6));
      setLon(waypoint.lon.toFixed(6));
      setIcon(waypoint.icon);
    } else if (mode === 'add') {
      setName(''); setDesc(''); setLat(''); setLon(''); setIcon('📍');
    } else if (mode === 'addAtCoords' && coords) {
      setName(''); setDesc('');
      setLat(coords.lat.toFixed(6));
      setLon(coords.lon.toFixed(6));
      setIcon('📍');
    } else if (mode === 'editTurn' && turn) {
      setName(turn.label || '');
      setLat(turn.lat.toFixed(6));
      setLon(turn.lon.toFixed(6));
      setTurnDir(turn.direction);
      setSharpness(turn.sharpness);
      setAngle(turn.angle.toFixed(0));
    } else if (mode === 'editMileMarker' && mileMarker) {
      setName(mileMarker.customLabel || mileMarker.label);
      setLat(mileMarker.lat.toFixed(6));
      setLon(mileMarker.lon.toFixed(6));
      setIcon(mileMarker.icon || '📏');
    }
  }, [open, mode, waypoint, turn, coords, mileMarker]);

  if (!open) return null;

  const isTurn = mode === 'editTurn';
  const isMileMarker = mode === 'editMileMarker';

  const handleApply = () => {
    if (isTurn && turn && turnIndex !== undefined && turnIndex !== null) {
      const updated: DetectedTurn = {
        ...turn,
        label: name || '',
        direction: turnDir,
        sharpness,
        angle: parseFloat(angle) || turn.angle,
        lat: parseFloat(lat) || turn.lat,
        lon: parseFloat(lon) || turn.lon,
      };
      onSaveTurn(updated, turnIndex);
    } else if (isMileMarker && mileMarker && mileMarkerIndex !== undefined && mileMarkerIndex !== null) {
      const updated: MileMarker = {
        ...mileMarker,
        customLabel: name.trim() || '',
        icon,
        lat: parseFloat(lat) || mileMarker.lat,
        lon: parseFloat(lon) || mileMarker.lon,
      };
      onSaveMileMarker(updated, mileMarkerIndex);
    } else {
      const wpName = name.trim() || 'Unnamed';
      const wpLat = parseFloat(lat);
      const wpLon = parseFloat(lon);
      if (isNaN(wpLat) || isNaN(wpLon)) { alert('Invalid coordinates'); return; }
      const wp: Waypoint = {
        name: wpName,
        lat: wpLat,
        lon: wpLon,
        ele: waypoint?.ele ?? null,
        desc: desc.trim(),
        icon,
        enabled: waypoint?.enabled ?? true,
      };
      onSaveWaypoint(wp, mode === 'edit' ? editIndex : null);
    }
    onClose();
  };

  const handleDelete = () => {
    if (isTurn && turnIndex !== undefined && turnIndex !== null) {
      onDeleteTurn(turnIndex);
    } else if (isMileMarker && mileMarkerIndex !== undefined && mileMarkerIndex !== null) {
      onDeleteMileMarker(mileMarkerIndex);
    } else if (editIndex !== null) {
      onDeleteWaypoint(editIndex);
    }
    onClose();
  };

  const title = isTurn
    ? `Edit Turn #${(turnIndex ?? 0) + 1}`
    : isMileMarker
    ? `Edit Mile Marker: ${mileMarker?.label}`
    : mode === 'edit'
    ? `Edit: ${waypoint?.name}`
    : 'Add Waypoint';

  const applyLabel = isTurn ? 'Save Turn' : isMileMarker ? 'Save Marker' : mode === 'edit' ? 'Save' : 'Add';
  const showDelete = mode === 'edit' || mode === 'editTurn' || mode === 'editMileMarker';

  // Which icon set to show
  const iconSet = isMileMarker ? MILE_MARKER_ICONS : WAYPOINT_ICONS;
  const showIconGrid = !isTurn; // show for waypoints AND mile markers

  return (
    <div
      className="modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}
    >
      <div style={{ background: 'var(--surface)', border: '1px solid #444', borderRadius: 'var(--radius)', padding: 20, width: 380, maxHeight: '80vh', overflowY: 'auto' }}>
        <h3 style={{ marginBottom: 12, fontSize: '1rem' }}>{title}</h3>

        {/* Name / Label */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: 4 }}>
            {isTurn ? 'Custom Label (optional)' : isMileMarker ? 'Display Label' : 'Name'}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isTurn ? 'Auto-generated if empty' : isMileMarker ? 'e.g. "Fuel Stop 5mi" or leave for default' : 'Waypoint name'}
            style={{ width: '100%', background: 'var(--bg)', border: '1px solid #444', color: 'var(--text)', padding: '8px 10px', borderRadius: 4, fontSize: '0.9rem' }}
          />
        </div>

        {/* Description (waypoint only) */}
        {!isTurn && !isMileMarker && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: 4 }}>Description (optional)</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Notes..."
              style={{ width: '100%', background: 'var(--bg)', border: '1px solid #444', color: 'var(--text)', padding: '8px 10px', borderRadius: 4, fontSize: '0.9rem', fontFamily: 'inherit', resize: 'vertical', minHeight: 60 }}
            />
          </div>
        )}

        {/* Distance info (mile marker only, read-only) */}
        {isMileMarker && mileMarker && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: 4 }}>Distance</label>
            <div style={{ background: 'var(--bg)', border: '1px solid #444', padding: '8px 10px', borderRadius: 4, fontSize: '0.9rem', color: 'var(--text-dim)' }}>
              {mileMarker.label} (auto-calculated)
            </div>
          </div>
        )}

        {/* Coordinates */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: 4 }}>Coordinates</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="number" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude" step="any"
              style={{ flex: 1, background: 'var(--bg)', border: '1px solid #444', color: 'var(--text)', padding: '8px 10px', borderRadius: 4, fontSize: '0.9rem' }}
            />
            <input type="number" value={lon} onChange={(e) => setLon(e.target.value)} placeholder="Longitude" step="any"
              style={{ flex: 1, background: 'var(--bg)', border: '1px solid #444', color: 'var(--text)', padding: '8px 10px', borderRadius: 4, fontSize: '0.9rem' }}
            />
          </div>
        </div>

        {/* Turn-specific fields */}
        {isTurn && (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: 4 }}>Direction</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn btn-sm"
                  style={{
                    flex: 1,
                    background: turnDir === 'left' ? 'var(--accent)' : 'var(--surface2)',
                    color: turnDir === 'left' ? '#fff' : 'var(--text)',
                    borderColor: turnDir === 'left' ? 'var(--accent)' : '#444',
                  }}
                  onClick={() => setTurnDir('left')}
                >← Left</button>
                <button
                  className="btn btn-sm"
                  style={{
                    flex: 1,
                    background: turnDir === 'right' ? 'var(--accent)' : 'var(--surface2)',
                    color: turnDir === 'right' ? '#fff' : 'var(--text)',
                    borderColor: turnDir === 'right' ? 'var(--accent)' : '#444',
                  }}
                  onClick={() => setTurnDir('right')}
                >Right →</button>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: 4 }}>Sharpness</label>
              <select value={sharpness} onChange={(e) => setSharpness(e.target.value as DetectedTurn['sharpness'])}
                style={{ width: '100%', background: 'var(--bg)', border: '1px solid #444', color: 'var(--text)', padding: '6px 8px', borderRadius: 4, fontSize: '0.85rem' }}
              >
                <option value="flat">Flat (gentle curve)</option>
                <option value="slight">Slight</option>
                <option value="moderate">Moderate</option>
                <option value="sharp">Sharp</option>
                <option value="hairpin">Hairpin</option>
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: 4 }}>Angle (degrees)</label>
              <input type="number" value={angle} onChange={(e) => setAngle(e.target.value)} min="0" max="360" step="1"
                style={{ width: '100%', background: 'var(--bg)', border: '1px solid #444', color: 'var(--text)', padding: '8px 10px', borderRadius: 4, fontSize: '0.9rem' }}
              />
            </div>
          </>
        )}

        {/* Icon grid (waypoint and mile marker) */}
        {showIconGrid && (
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: 6, display: 'block' }}>Icon</label>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isMileMarker ? 5 : 8}, 1fr)`, gap: 4, marginBottom: 16 }}>
              {iconSet.map((ic) => (
                <div
                  key={ic}
                  onClick={() => setIcon(ic)}
                  style={{
                    width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.2rem', background: 'var(--bg)',
                    border: `2px solid ${ic === icon ? 'var(--green)' : 'transparent'}`,
                    borderRadius: 6, cursor: 'pointer', transition: 'all 0.15s',
                    ...(ic === icon ? { background: 'rgba(78,205,196,0.15)' } : {}),
                  }}
                >{ic}</div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          {showDelete && (
            <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
          )}
          <button className="btn btn-primary" onClick={handleApply}>{applyLabel}</button>
        </div>
      </div>
    </div>
  );
}
