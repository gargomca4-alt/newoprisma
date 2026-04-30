import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://jxcdobbfxsawcxjeeqid.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4Y2RvYmJmeHNhd2N4amVlcWlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NzM3NjIsImV4cCI6MjA5MzA0OTc2Mn0.MQXxg-QmmCXzss25XwhpDya-KI9GDKwqnUcLwnOasRo";

// Usage: import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});