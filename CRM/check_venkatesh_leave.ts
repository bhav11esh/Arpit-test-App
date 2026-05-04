import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Try common paths
dotenv.config(); // Current dir
dotenv.config({ path: path.join(process.cwd(), '..', '.env') });
dotenv.config({ path: path.join(process.cwd(), 'CRM', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkLeave() {
  // 1. Find user
  const { data: users, error: uError } = await supabase
    .from('users')
    .select('id, name')
    .ilike('name', '%Venkatesh%');

  if (uError) {
    console.error('User search error:', uError);
    return;
  }

  if (!users || users.length === 0) {
    console.log('User not found');
    return;
  }

  const user = users[0];
  console.log(`Found user: ${user.name} (${user.id})`);

  // 2. Check leaves for today
  const today = '2026-04-26';
  const { data: leaves, error: lError } = await supabase
    .from('leaves')
    .select('*')
    .eq('photographer_id', user.id)
    .eq('date', today);

  if (lError) {
    console.error('Leave check error:', lError);
    return;
  }

  console.log('Leaves for today:', JSON.stringify(leaves));
}

checkLeave();
