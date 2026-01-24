-- Google Drive Integration Tables
-- Run this migration in Supabase SQL Editor

-- Table for storing Google OAuth tokens
CREATE TABLE IF NOT EXISTS google_drive_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMPTZ NOT NULL,
  scopes TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Table for storing user-selected Drive folders
CREATE TABLE IF NOT EXISTS drive_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder_id TEXT NOT NULL,
  folder_name TEXT NOT NULL,
  purpose TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, folder_id)
);

-- Enable RLS
ALTER TABLE google_drive_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_folders ENABLE ROW LEVEL SECURITY;

-- RLS Policies for google_drive_grants
CREATE POLICY "Users can view their own drive grants"
  ON google_drive_grants FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own drive grants"
  ON google_drive_grants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drive grants"
  ON google_drive_grants FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drive grants"
  ON google_drive_grants FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for drive_folders
CREATE POLICY "Users can view their own drive folders"
  ON drive_folders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own drive folders"
  ON drive_folders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drive folders"
  ON drive_folders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drive folders"
  ON drive_folders FOR DELETE
  USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_drive_folders_user_id ON drive_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_google_drive_grants_user_id ON google_drive_grants(user_id);
