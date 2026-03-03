'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  original_file_name: string | null;
  created_at: string;
  updated_at: string;
}

export default function ProjectCard({
  project,
  onDelete,
}: {
  project: ProjectSummary;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
  };

  return (
    <div
      style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius)',
        padding: 20,
        cursor: 'pointer',
        border: '1px solid transparent',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'transparent')}
      onClick={() => router.push(`/dashboard/${project.id}`)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>🏁 {project.name}</h3>
        <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
          {timeAgo(project.updated_at)}
        </span>
      </div>

      {project.description && (
        <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: 8, lineHeight: 1.4 }}>
          {project.description}
        </p>
      )}

      {project.original_file_name && (
        <p style={{ fontSize: '0.75rem', color: 'var(--accent2)' }}>
          📄 {project.original_file_name}
        </p>
      )}

      <div
        style={{ marginTop: 12, display: 'flex', gap: 8 }}
        onClick={(e) => e.stopPropagation()}
      >
        {!confirming ? (
          <button
            className="btn btn-danger btn-sm"
            onClick={() => setConfirming(true)}
          >
            Delete
          </button>
        ) : (
          <>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => { onDelete(project.id); setConfirming(false); }}
            >
              Confirm Delete
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setConfirming(false)}
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
}
