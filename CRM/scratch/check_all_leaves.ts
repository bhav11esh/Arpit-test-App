import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();
dotenv.config({ path: path.join(process.cwd(), '..', '.env') });
dotenv.config({ path: path.join(process.cwd(), 'CRM', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllLeaves() {
  const today = '2026-04-26';
  const { data: leaves, error } = await supabase
    .from('leaves')
    .select('*, users(name)')
    .eq('date', today);

  if (error) {
    console.error('Query error:', error);
    return;
  }

  console.log('--- SAMPLE LEAVES ---');
  console.log(JSON.stringify(leaves, null, 2));
}

checkAllLeaves();
