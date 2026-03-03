'use client';

import type { DetectedTurn } from '@/lib/types';
import { TURN_COLORS } from '@/lib/types';

interface TurnListProps {
  turns: DetectedTurn[];
  onZoom: (idx: number) => void;
  onEdit: (idx: number) => void;
  onDelete: (idx: number) => void;
}

export default function TurnList({ turns, onZoom, onEdit, onDelete }: TurnListProps) {
  if (!turns.length) {
    return <div style={{ color: '#666', fontSize: '0.78rem', padding: 4 }}>No turns detected</div>;
  }

  return (
    <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 8 }}>
      {turns.map((t, i) => {
        const arrow = t.direction === 'left' ? '←' : '→';
        const color = TURN_COLORS[t.sharpness];
        const label = t.label || `${arrow} ${t.sharpness} ${t.angle.toFixed(0)}°`;

        return (
          <div
            key={i}
            onClick={() => onZoom(i)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 6px', borderRadius: 4, marginBottom: 2,
              background: 'rgba(255,255,255,0.03)', fontSize: '0.78rem', cursor: 'pointer',
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>{label}</div>
            <div
              onClick={(e) => { e.stopPropagation(); onEdit(i); }}
              title="Edit"
              style={{ color: 'var(--blue)', cursor: 'pointer', padding: '0 4px' }}
            >✏️</div>
            <div
              onClick={(e) => { e.stopPropagation(); onDelete(i); }}
              title="Remove"
              style={{ color: '#666', cursor: 'pointer', padding: '0 4px' }}
            >✕</div>
          </div>
        );
      })}
    </div>
  );
}
