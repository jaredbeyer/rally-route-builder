'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser';
import ProjectCard from '@/components/ProjectCard';

interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  original_file_name: string | null;
  created_at: string;
  updated_at: string;
}

export default function DashboardPage() {
  const supabase = createClient();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    const res = await fetch('/api/projects');
    if (res.ok) {
      setProjects(await res.json());
    }
    setLoading(false);
  };

  const createProject = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, description: newDesc }),
      });
      if (res.ok) {
        setNewName('');
        setNewDesc('');
        setShowNew(false);
        await fetchProjects();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Failed to create project (${res.status})`);
      }
    } catch (err) {
      setError(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
    setCreating(false);
  };

  const deleteProject = async (id: string) => {
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>
            🏁 <span style={{ color: 'var(--accent)' }}>Rally</span> Route Builder
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginTop: 4 }}>Your projects</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>
            + New Project
          </button>
          <button className="btn btn-secondary" onClick={signOut}>
            Sign Out
          </button>
        </div>
      </div>

      {/* New Project Form */}
      {showNew && (
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius)',
            padding: 20,
            marginBottom: 24,
            border: '1px solid var(--accent)',
          }}
        >
          <h3 style={{ marginBottom: 12, fontWeight: 600 }}>New Project</h3>
          <input
            type="text"
            placeholder="Project name (e.g. Baja 500 Stage 2)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createProject()}
            autoFocus
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--bg)',
              border: '1px solid #444',
              borderRadius: 'var(--radius)',
              color: 'var(--text)',
              fontSize: '0.9rem',
              marginBottom: 8,
            }}
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--bg)',
              border: '1px solid #444',
              borderRadius: 'var(--radius)',
              color: 'var(--text)',
              fontSize: '0.9rem',
              marginBottom: 12,
            }}
          />
          {error && (
            <p style={{ color: 'var(--red)', fontSize: '0.82rem', marginBottom: 8 }}>{error}</p>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-success" onClick={createProject} disabled={creating || !newName.trim()}>
              {creating ? 'Creating...' : 'Create Project'}
            </button>
            <button className="btn btn-secondary" onClick={() => { setShowNew(false); setNewName(''); setNewDesc(''); setError(null); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Project List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>Loading projects...</div>
      ) : projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🗺️</div>
          <p style={{ color: 'var(--text-dim)', marginBottom: 16 }}>No projects yet. Create one to get started!</p>
          <button className="btn btn-primary" onClick={() => setShowNew(true)}>
            + New Project
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} onDelete={deleteProject} />
          ))}
        </div>
      )}
    </div>
  );
}
