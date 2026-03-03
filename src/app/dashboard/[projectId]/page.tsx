import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import MapEditorWrapper from './MapEditorWrapper';

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/');

  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', user.id)
    .single();

  if (error || !project) redirect('/dashboard');

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        background: 'var(--surface)', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 16,
        borderBottom: '2px solid var(--accent)',
      }}>
        <a href="/dashboard" style={{ color: 'var(--text-dim)', fontSize: '0.85rem', textDecoration: 'none' }}>← Back</a>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700 }}>
          🏁 <span style={{ color: 'var(--accent)' }}>Rally</span> Route Builder
        </h1>
        <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>{project.name}</div>
      </div>

      {/* Map Editor */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <MapEditorWrapper project={project} />
      </div>
    </div>
  );
}
