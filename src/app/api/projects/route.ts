import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { DEFAULT_SETTINGS } from '@/lib/types';

// GET /api/projects — list all projects for the authenticated user
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', detail: authError?.message || 'No user session' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from('projects')
      .select('id, name, description, original_file_name, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message, hint: error.hint, code: error.code },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: `Server error: ${err instanceof Error ? err.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}

// POST /api/projects — create a new project
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', detail: authError?.message || 'No user session' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        name,
        description: body.description?.trim() || '',
        settings: DEFAULT_SETTINGS,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message, hint: error.hint, code: error.code },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: `Server error: ${err instanceof Error ? err.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
