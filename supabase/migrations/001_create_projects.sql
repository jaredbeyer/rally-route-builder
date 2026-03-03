-- Rally Route Builder — Database Migration
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- =============================================
-- 1. Create the projects table
-- =============================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  original_file_path TEXT,
  original_file_name TEXT,
  route_points JSONB DEFAULT '[]'::jsonb,
  detected_turns JSONB DEFAULT '[]'::jsonb,
  mile_markers JSONB DEFAULT '[]'::jsonb,
  waypoints JSONB DEFAULT '[]'::jsonb,
  settings JSONB DEFAULT '{
    "smoothWindow": 5,
    "minTurnAngle": 20,
    "thresholds": {"flat": 30, "slight": 60, "moderate": 100, "sharp": 140},
    "mileInterval": 1,
    "mileUnit": "miles"
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 2. Enable Row Level Security
-- =============================================
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Users can only access their own projects
CREATE POLICY "Users can select own projects"
  ON projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- 3. Create indexes
-- =============================================
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_updated_at ON projects(updated_at DESC);

-- =============================================
-- 4. Create the storage bucket for route files
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('route-files', 'route-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: users can manage their own folder
CREATE POLICY "Users can upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'route-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'route-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'route-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
