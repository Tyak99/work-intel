-- Google Drive Integration Tables

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

-- Table for OAuth CSRF state tokens
CREATE TABLE IF NOT EXISTS drive_oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  state_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Enable RLS (matching existing pattern with permissive policies)
ALTER TABLE google_drive_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_oauth_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on google_drive_grants"
  ON google_drive_grants FOR ALL
  USING (true);

CREATE POLICY "Allow all operations on drive_folders"
  ON drive_folders FOR ALL
  USING (true);

CREATE POLICY "Allow all operations on drive_oauth_states"
  ON drive_oauth_states FOR ALL
  USING (true);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_drive_folders_user_id ON drive_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_google_drive_grants_user_id ON google_drive_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_drive_oauth_states_token ON drive_oauth_states(state_token);
CREATE INDEX IF NOT EXISTS idx_drive_oauth_states_expires ON drive_oauth_states(expires_at);
