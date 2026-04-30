import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://yoftcaneyrlfrkuqmubf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvZnRjYW5leXJsZnJrdXFtdWJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0ODc1MzgsImV4cCI6MjA5MzA2MzUzOH0.clWJpFfdSFUIQBbQJyP63t6hDG0YlZ8tw2bmlpHZeUk";

// Usage: import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});