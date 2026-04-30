import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
let supabaseUrl = '';
let supabaseKey = '';

env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) supabaseUrl = line.split('="')[1].replace('"', '').trim();
  if (line.startsWith('VITE_SUPABASE_PUBLISHABLE_KEY=')) supabaseKey = line.split('="')[1].replace('"', '').trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Testing delete print_types...");
  const { data, error } = await supabase.from('print_types').delete().eq('name', 'Test API Print').select();
  if (error) {
    console.error("Error deleting print_types:", error);
  } else {
    console.log("Success. Deleted:", data);
  }
}

test();
