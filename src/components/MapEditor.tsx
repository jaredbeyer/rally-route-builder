'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Project, RoutePoint, DetectedTurn, MileMarker, Waypoint, RouteSettings } from '@/lib/types';
import { DEFAULT_SETTINGS, TURN_COLORS } from '@/lib/types';
import { detectTurns } from '@/lib/turns';
import { calculateMileMarkers } from '@/lib/miles';
import { parseGPX, parseKML } from '@/lib/parsers';
import { exportGPX, exportKML, downloadFile } from '@/lib/exporters';
import Sidebar from './Sidebar';
import IconPickerModal from './IconPickerModal';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapEditorProps {
  project: Project;
}

export default function MapEditor({ project }: MapEditorProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Layer[]>([]);
  const routeLayerRef = useRef<L.Polyline | null>(null);

  // Route data state
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>(project.route_points || []);
  const [detectedTurns, setDetectedTurns] = useState<DetectedTurn[]>(project.detected_turns || []);
  const [mileMarkers, setMileMarkers] = useState<MileMarker[]>(project.mile_markers || []);
  const [waypoints, setWaypoints] = useState<Waypoint[]>(project.waypoints || []);
  const [settings, setSettings] = useState<RouteSettings>(project.settings || DEFAULT_SETTINGS);
  const [fileName, setFileName] = useState<string | null>(project.original_file_name || null);

  // UI state
  const [pinMode, setPinMode] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [liveEditMode, setLiveEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(project.updated_at || null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'edit' | 'add' | 'addAtCoords' | 'editTurn' | 'editMileMarker'>('edit');
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [modalCoords, setModalCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Initialize Leaflet map
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, { zoomControl: true }).setView([39.5, -98.35], 4);
    const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap', maxZoom: 19,
    });
    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; Esri', maxZoom: 19,
    });
    const topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenTopoMap', maxZoom: 17,
    });
    L.control.layers({ Street: osm.addTo(map), Satellite: satellite, Topo: topo }, undefined, { position: 'topright' }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Map click handler for pin mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handler = (e: L.LeafletMouseEvent) => {
      if (!pinMode) return;
      setModalMode('addAtCoords');
      setEditIndex(null);
      setModalCoords({ lat: e.latlng.lat, lon: e.latlng.lng });
      setModalOpen(true);
    };

    map.on('click', handler);
    return () => { map.off('click', handler); };
  }, [pinMode]);

  // Render map whenever data changes
  const renderMap = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing
    markersRef.current.forEach((l) => map.removeLayer(l));
    markersRef.current = [];
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    if (!routePoints.length) return;

    // Route line
    const latlngs: [number, number][] = routePoints.map((p) => [p.lat, p.lon]);
    const polyline = L.polyline(latlngs, { color: '#fff', weight: 3, opacity: 0.7 }).addTo(map);
    routeLayerRef.current = polyline;
    map.fitBounds(polyline.getBounds(), { padding: [30, 30] });

    // Start/End
    const sIcon = L.divIcon({ className: '', html: '<div style="font-size:1.4rem;text-shadow:0 1px 4px #000;">🟢</div>', iconSize: [24, 24], iconAnchor: [12, 12] });
    const eIcon = L.divIcon({ className: '', html: '<div style="font-size:1.4rem;text-shadow:0 1px 4px #000;">🏁</div>', iconSize: [24, 24], iconAnchor: [12, 12] });
    markersRef.current.push(L.marker([routePoints[0].lat, routePoints[0].lon], { icon: sIcon }).addTo(map).bindPopup('Start'));
    const last = routePoints[routePoints.length - 1];
    markersRef.current.push(L.marker([last.lat, last.lon], { icon: eIcon }).addTo(map).bindPopup('Finish'));

    // Turn markers
    detectedTurns.forEach((turn, tidx) => {
      const color = TURN_COLORS[turn.sharpness];
      const arrowChar = turn.direction === 'left' ? '↰' : '↱';
      const borderStyle = liveEditMode ? '2px dashed #ff0' : '2px solid #fff';
      const icon = L.divIcon({
        className: '',
        html: `<div style="background:${color};color:#fff;width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;border:${borderStyle};box-shadow:0 1px 6px rgba(0,0,0,0.5);line-height:1;cursor:${liveEditMode ? 'grab' : 'pointer'};">${arrowChar}</div>`,
        iconSize: [26, 26], iconAnchor: [13, 13],
      });
      const turnLabel = turn.label || `${turn.sharpness.toUpperCase()} ${turn.direction.toUpperCase()}`;
      const m = L.marker([turn.lat, turn.lon], { icon, draggable: liveEditMode }).addTo(map);
      m.bindPopup(`<b>${turnLabel}</b><br>Angle: ${turn.angle.toFixed(1)}°<br><small>${turn.sharpness} ${turn.direction}</small><div style="display:flex;gap:4px;margin-top:8px;"><button class="popup-btn popup-btn-edit" data-turn="${tidx}" style="padding:4px 10px;border-radius:3px;border:none;cursor:pointer;font-size:0.75rem;font-weight:600;background:#3498db;color:#fff;">✏️ Edit</button><button class="popup-btn popup-btn-del" data-turndelete="${tidx}" style="padding:4px 10px;border-radius:3px;border:none;cursor:pointer;font-size:0.75rem;font-weight:600;background:#e94560;color:#fff;">🗑 Remove</button></div>`);
      if (liveEditMode) {
        m.on('dragend', (e: L.DragEndEvent) => {
          const pos = (e.target as L.Marker).getLatLng();
          setDetectedTurns((prev) => {
            const next = [...prev];
            next[tidx] = { ...next[tidx], lat: pos.lat, lon: pos.lng };
            return next;
          });
        });
      }
      markersRef.current.push(m);
    });

    // Mile markers
    mileMarkers.forEach((mm, midx) => {
      const mmBorderStyle = liveEditMode ? '2px dashed #ff0' : '1.5px solid #fff';
      const mmCursor = liveEditMode ? 'grab' : 'pointer';
      const mmIcon = mm.icon && mm.icon !== '📏'
        ? L.divIcon({
            className: '',
            html: `<div style="font-size:1.3rem;text-shadow:0 1px 4px #000;cursor:${mmCursor};${liveEditMode ? 'filter:drop-shadow(0 0 3px #ff0);' : ''}" title="${mm.customLabel || mm.label}">${mm.icon}</div>`,
            iconSize: [24, 24], iconAnchor: [12, 12],
          })
        : L.divIcon({
            className: '',
            html: `<div style="background:#3498db;color:#fff;padding:2px 6px;border-radius:10px;font-size:11px;font-weight:bold;white-space:nowrap;border:${mmBorderStyle};box-shadow:0 1px 4px rgba(0,0,0,0.5);cursor:${mmCursor};">${mm.customLabel || mm.label}</div>`,
            iconSize: [0, 0], iconAnchor: [20, 10],
          });
      const displayLabel = mm.customLabel || mm.label;
      const m = L.marker([mm.lat, mm.lon], { icon: mmIcon, draggable: liveEditMode }).addTo(map);
      m.bindPopup(`<b>${mm.icon && mm.icon !== '📏' ? mm.icon + ' ' : ''}${displayLabel}</b><br><small>${mm.label} (distance)</small><br><small>${mm.lat.toFixed(5)}, ${mm.lon.toFixed(5)}</small><div style="display:flex;gap:4px;margin-top:8px;"><button data-mmedit="${midx}" style="padding:4px 10px;border-radius:3px;border:none;cursor:pointer;font-size:0.75rem;font-weight:600;background:#3498db;color:#fff;">✏️ Edit</button><button data-mmdelete="${midx}" style="padding:4px 10px;border-radius:3px;border:none;cursor:pointer;font-size:0.75rem;font-weight:600;background:#e94560;color:#fff;">🗑 Remove</button></div>`);
      if (liveEditMode) {
        m.on('dragend', (e: L.DragEndEvent) => {
          const pos = (e.target as L.Marker).getLatLng();
          setMileMarkers((prev) => {
            const next = [...prev];
            next[midx] = { ...next[midx], lat: pos.lat, lon: pos.lng };
            return next;
          });
        });
      }
      markersRef.current.push(m);
    });

    // Waypoints (draggable only in live edit mode)
    waypoints.forEach((wp, idx) => {
      if (!wp.enabled) return;
      const wpCursor = liveEditMode ? 'grab' : 'pointer';
      const icon = L.divIcon({
        className: '',
        html: `<div style="font-size:1.3rem;text-shadow:0 1px 4px #000;cursor:${wpCursor};${liveEditMode ? 'filter:drop-shadow(0 0 3px #ff0);' : ''}" title="${wp.name}">${wp.icon}</div>`,
        iconSize: [24, 24], iconAnchor: [12, 12],
      });
      const m = L.marker([wp.lat, wp.lon], { icon, draggable: liveEditMode }).addTo(map);
      m.bindPopup(`<b>${wp.icon} ${wp.name}</b>${wp.desc ? '<br><i>' + wp.desc + '</i>' : ''}<br><small>${wp.lat.toFixed(5)}, ${wp.lon.toFixed(5)}</small><div style="display:flex;gap:4px;margin-top:8px;"><button data-wpedit="${idx}" style="padding:4px 10px;border-radius:3px;border:none;cursor:pointer;font-size:0.75rem;font-weight:600;background:#3498db;color:#fff;">✏️ Edit</button><button data-wpdelete="${idx}" style="padding:4px 10px;border-radius:3px;border:none;cursor:pointer;font-size:0.75rem;font-weight:600;background:#e94560;color:#fff;">🗑 Delete</button></div>`);
      if (liveEditMode) {
        m.on('dragend', (e: L.DragEndEvent) => {
          const pos = (e.target as L.Marker).getLatLng();
          setWaypoints((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], lat: pos.lat, lon: pos.lng };
            return next;
          });
        });
      }
      markersRef.current.push(m);
    });

    // Popup click delegation for edit/delete buttons
    map.off('popupopen').on('popupopen', (e: L.PopupEvent) => {
      const container = e.popup.getElement();
      if (!container) return;

      container.querySelectorAll('[data-turn]').forEach((btn) => {
        (btn as HTMLElement).onclick = () => {
          const idx = parseInt(btn.getAttribute('data-turn')!);
          map.closePopup();
          setModalMode('editTurn');
          setEditIndex(idx);
          setModalOpen(true);
        };
      });
      container.querySelectorAll('[data-turndelete]').forEach((btn) => {
        (btn as HTMLElement).onclick = () => {
          const idx = parseInt(btn.getAttribute('data-turndelete')!);
          map.closePopup();
          setDetectedTurns((prev) => prev.filter((_, i) => i !== idx));
        };
      });
      container.querySelectorAll('[data-wpedit]').forEach((btn) => {
        (btn as HTMLElement).onclick = () => {
          const idx = parseInt(btn.getAttribute('data-wpedit')!);
          map.closePopup();
          setModalMode('edit');
          setEditIndex(idx);
          setModalOpen(true);
        };
      });
      container.querySelectorAll('[data-wpdelete]').forEach((btn) => {
        (btn as HTMLElement).onclick = () => {
          const idx = parseInt(btn.getAttribute('data-wpdelete')!);
          map.closePopup();
          setWaypoints((prev) => prev.filter((_, i) => i !== idx));
        };
      });
      container.querySelectorAll('[data-mmedit]').forEach((btn) => {
        (btn as HTMLElement).onclick = () => {
          const idx = parseInt(btn.getAttribute('data-mmedit')!);
          map.closePopup();
          setModalMode('editMileMarker');
          setEditIndex(idx);
          setModalOpen(true);
        };
      });
      container.querySelectorAll('[data-mmdelete]').forEach((btn) => {
        (btn as HTMLElement).onclick = () => {
          const idx = parseInt(btn.getAttribute('data-mmdelete')!);
          map.closePopup();
          setMileMarkers((prev) => prev.filter((_, i) => i !== idx));
        };
      });
    });
  }, [routePoints, detectedTurns, mileMarkers, waypoints, deleteMode, liveEditMode]);

  useEffect(() => {
    renderMap();
  }, [renderMap]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalOpen(false);
        setPinMode(false);
        setDeleteMode(false);
        setLiveEditMode(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // === Sidebar Callbacks ===

  const handleFileLoad = (content: string, name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    const result = ext === 'kml' ? parseKML(content) : parseGPX(content);

    setRoutePoints(result.routePoints);
    setWaypoints(result.waypoints);
    setFileName(name);

    if (result.isReimport && result.detectedTurns.length > 0) {
      setDetectedTurns(result.detectedTurns);
    } else {
      setDetectedTurns(detectTurns(result.routePoints, settings));
    }

    if (result.isReimport && result.mileMarkers.length > 0) {
      setMileMarkers(result.mileMarkers);
    } else {
      setMileMarkers(calculateMileMarkers(result.routePoints, settings));
    }
  };

  const handleResetFile = () => {
    setRoutePoints([]); setDetectedTurns([]); setMileMarkers([]); setWaypoints([]);
    setFileName(null); setPinMode(false); setDeleteMode(false); setLiveEditMode(false);
  };

  const handleSettingsChange = (partial: Partial<RouteSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const handleReprocessTurns = () => {
    setDetectedTurns(detectTurns(routePoints, settings));
  };

  const handleForceRedetect = () => {
    if (!confirm('This will discard all manually edited turns and re-run auto-detection. Continue?')) return;
    setDetectedTurns(detectTurns(routePoints, settings));
    setMileMarkers(calculateMileMarkers(routePoints, settings));
  };

  const handleReprocessMiles = () => {
    setMileMarkers(calculateMileMarkers(routePoints, settings));
  };

  const handleExportGPX = () => {
    const content = exportGPX(routePoints, detectedTurns, mileMarkers, waypoints);
    downloadFile(content, `${project.name || 'rally-route'}.gpx`, 'application/gpx+xml');
  };

  const handleExportKML = () => {
    const content = exportKML(routePoints, detectedTurns, mileMarkers, waypoints);
    downloadFile(content, `${project.name || 'rally-route'}.kml`, 'application/vnd.google-earth.kml+xml');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routePoints, detectedTurns, mileMarkers, waypoints, settings,
          original_file_name: fileName,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setLastSaved(data.updated_at);
      }
    } catch (err) {
      console.error('Save failed:', err);
    }
    setSaving(false);
  };

  // Modal handlers
  const handleSaveWaypoint = (wp: Waypoint, index: number | null) => {
    if (index !== null) {
      setWaypoints((prev) => { const next = [...prev]; next[index] = wp; return next; });
    } else {
      setWaypoints((prev) => [...prev, wp]);
    }
  };

  const handleDeleteWaypoint = (index: number) => {
    setWaypoints((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveTurn = (turn: DetectedTurn, index: number) => {
    setDetectedTurns((prev) => { const next = [...prev]; next[index] = turn; return next; });
  };

  const handleDeleteTurn = (index: number) => {
    setDetectedTurns((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveMileMarker = (mm: MileMarker, index: number) => {
    setMileMarkers((prev) => { const next = [...prev]; next[index] = mm; return next; });
  };

  const handleDeleteMileMarker = (index: number) => {
    setMileMarkers((prev) => prev.filter((_, i) => i !== index));
  };

  const fitRoute = () => {
    if (routeLayerRef.current && mapRef.current) {
      mapRef.current.fitBounds(routeLayerRef.current.getBounds(), { padding: [30, 30] });
    }
  };

  const zoomTo = (lat: number, lon: number) => {
    mapRef.current?.setView([lat, lon], 16);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', height: 'calc(100vh - 56px)' }}>
      <Sidebar
        routePoints={routePoints}
        detectedTurns={detectedTurns}
        mileMarkers={mileMarkers}
        waypoints={waypoints}
        settings={settings}
        fileName={fileName}
        saving={saving}
        lastSaved={lastSaved}
        onFileLoad={handleFileLoad}
        onResetFile={handleResetFile}
        onSettingsChange={handleSettingsChange}
        onReprocessTurns={handleReprocessTurns}
        onForceRedetect={handleForceRedetect}
        onReprocessMiles={handleReprocessMiles}
        onEditTurn={(idx) => { setModalMode('editTurn'); setEditIndex(idx); setModalOpen(true); }}
        onDeleteTurn={(idx) => setDetectedTurns((prev) => prev.filter((_, i) => i !== idx))}
        onZoomTurn={(idx) => { const t = detectedTurns[idx]; if (t) zoomTo(t.lat, t.lon); }}
        onEditWaypoint={(idx) => { setModalMode('edit'); setEditIndex(idx); setModalOpen(true); }}
        onToggleWaypoint={(idx, enabled) => setWaypoints((prev) => { const n = [...prev]; n[idx] = { ...n[idx], enabled }; return n; })}
        onDeleteWaypoint={(idx) => setWaypoints((prev) => prev.filter((_, i) => i !== idx))}
        onZoomWaypoint={(idx) => { const w = waypoints[idx]; if (w) zoomTo(w.lat, w.lon); }}
        onToggleAllWaypoints={(on) => setWaypoints((prev) => prev.map((w) => ({ ...w, enabled: on })))}
        onAddWaypoint={() => { setModalMode('add'); setEditIndex(null); setModalOpen(true); }}
        onEditMileMarker={(idx) => { setModalMode('editMileMarker'); setEditIndex(idx); setModalOpen(true); }}
        onDeleteMileMarker={(idx) => setMileMarkers((prev) => prev.filter((_, i) => i !== idx))}
        onZoomMileMarker={(idx) => { const m = mileMarkers[idx]; if (m) zoomTo(m.lat, m.lon); }}
        onExportGPX={handleExportGPX}
        onExportKML={handleExportKML}
        onSave={handleSave}
      />

      <div style={{ position: 'relative' }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

        {/* Map Toolbar */}
        {routePoints.length > 0 && (
          <div style={{
            position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 1000,
            display: 'flex', gap: 4, background: 'rgba(22,33,62,0.95)', padding: '6px 10px',
            borderRadius: 'var(--radius)', border: '1px solid #444', boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
          }}>
            <button
              onClick={() => { setPinMode((p) => !p); setDeleteMode(false); setLiveEditMode(false); }}
              style={{
                padding: '6px 12px', borderRadius: 4, border: `1px solid ${pinMode ? 'var(--green)' : '#555'}`,
                background: pinMode ? 'rgba(78,205,196,0.15)' : 'var(--bg)',
                color: pinMode ? 'var(--green)' : 'var(--text)',
                cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap',
              }}
            >📌 Add Pin</button>
            <button
              onClick={() => { setDeleteMode((d) => !d); setPinMode(false); setLiveEditMode(false); }}
              style={{
                padding: '6px 12px', borderRadius: 4, border: `1px solid ${deleteMode ? 'var(--green)' : '#555'}`,
                background: deleteMode ? 'rgba(78,205,196,0.15)' : 'var(--bg)',
                color: deleteMode ? 'var(--green)' : 'var(--text)',
                cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap',
              }}
            >🗑️ Delete Mode</button>
            <button
              onClick={() => { setLiveEditMode((m) => !m); setPinMode(false); setDeleteMode(false); }}
              style={{
                padding: '6px 12px', borderRadius: 4, border: `1px solid ${liveEditMode ? '#f5a623' : '#555'}`,
                background: liveEditMode ? 'rgba(245,166,35,0.15)' : 'var(--bg)',
                color: liveEditMode ? '#f5a623' : 'var(--text)',
                cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap',
              }}
            >✋ Live Edit</button>
            <button
              onClick={fitRoute}
              style={{
                padding: '6px 12px', borderRadius: 4, border: '1px solid #555', background: 'var(--bg)',
                color: 'var(--text)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap',
              }}
            >🔍 Fit Route</button>
          </div>
        )}
      </div>

      {/* Modal */}
      <IconPickerModal
        open={modalOpen}
        mode={modalMode}
        waypoint={modalMode === 'edit' && editIndex !== null ? waypoints[editIndex] : null}
        turn={modalMode === 'editTurn' && editIndex !== null ? detectedTurns[editIndex] : null}
        turnIndex={modalMode === 'editTurn' ? editIndex ?? undefined : undefined}
        mileMarker={modalMode === 'editMileMarker' && editIndex !== null ? mileMarkers[editIndex] : null}
        mileMarkerIndex={modalMode === 'editMileMarker' ? editIndex ?? undefined : undefined}
        coords={modalMode === 'addAtCoords' ? modalCoords : null}
        onClose={() => setModalOpen(false)}
        onSaveWaypoint={handleSaveWaypoint}
        onDeleteWaypoint={handleDeleteWaypoint}
        onSaveTurn={handleSaveTurn}
        onDeleteTurn={handleDeleteTurn}
        onSaveMileMarker={handleSaveMileMarker}
        onDeleteMileMarker={handleDeleteMileMarker}
        editIndex={editIndex}
      />
    </div>
  );
}
