
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
  const targetDate = '2026-04-12';
  const twoDaysAgo = '2026-04-10';

  console.log(`Checking for target date: ${targetDate}`);
  console.log(`Two days ago: ${twoDaysAgo}`);

  // 1. Check Mallikarjun's user record
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('*')
    .ilike('name', '%Mallikarjun%');
  
  if (userError) {
    console.error('User error:', userError);
    return;
  }
  
  console.log('\nMallikarjun User Records:');
  console.table(users);

  if (users.length === 0) return;
  const malliId = users[0].id;

  // 2. Check reel tasks for him
  const { data: reelTasks, error: reelError } = await supabase
    .from('reel_tasks')
    .select(`
      *,
      deliveries (*)
    `)
    .eq('assigned_user_id', malliId);

  if (reelError) {
    console.error('Reel error:', reelError);
    return;
  }

  console.log('\nReel Tasks for Mallikarjun:');
  console.table(reelTasks.map(t => ({
    id: t.id,
    status: t.status,
    delivery_name: t.deliveries.delivery_name,
    delivery_date: t.deliveries.date,
    deliveries_deleted_at: t.deliveries.deleted_at
  })));

  // 3. Run a simulation of the audit query
  console.log('\nSimulating Audit Query for Reel Backlogs...');
  const { data: auditTrial, error: auditError } = await supabase
    .from('reel_tasks')
    .select(`
      id,
      assigned_user_id,
      status,
      deliveries!inner (date, id)
    `)
    .eq('status', 'PENDING')
    .lte('deliveries.date', two_days_ago);

  if (auditError) {
    console.error('Audit trial error:', auditError);
  } else {
    console.log(`Audit query returned ${auditTrial?.length || 0} rows`);
    console.table(auditTrial);
  }
}

debug();
