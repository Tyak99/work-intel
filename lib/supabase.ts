import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please add SUPABASE_URL and SUPABASE_ANON_KEY to your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types for our tables
export interface NylasGrantRow {
  user_id: string;
  grant_id: string;
  email: string;
  provider: string;
  scopes: string[];
  created_at: string;
  last_sync?: string;
}

export interface ToolConnectionRow {
  id: string;
  user_id: string;
  tool_type: string;
  credentials: any;
  connected_at: string;
  last_sync?: string;
}