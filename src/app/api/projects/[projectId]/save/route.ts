import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import type { RouteData } from '@/lib/types';

interface Params { params: Promise<{ projectId: string }> }

// POST /api/projects/[projectId]/save — save all route data for a project
export async function POST(request: Request, { params }: Params) {
  const { projectId } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: RouteData & { original_file_name?: string; original_file_path?: string } = await request.json();

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (body.routePoints !== undefined) updates.route_points = body.routePoints;
  if (body.detectedTurns !== undefined) updates.detected_turns = body.detectedTurns;
  if (body.mileMarkers !== undefined) updates.mile_markers = body.mileMarkers;
  if (body.waypoints !== undefined) updates.waypoints = body.waypoints;
  if (body.settings !== undefined) updates.settings = body.settings;
  if (body.original_file_name) updates.original_file_name = body.original_file_name;
  if (body.original_file_path) updates.original_file_path = body.original_file_path;

  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .eq('user_id', user.id)
    .select('id, updated_at')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Project not found or save failed' }, { status: 404 });
  }

  return NextResponse.json({ success: true, updated_at: data.updated_at });
}
