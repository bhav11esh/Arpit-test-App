
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
  try {
    const targetDate = '2026-04-12';
    const twoDaysAgo = '2026-04-10';

    console.log(`Checking for target date: ${targetDate}`);
    console.log(`Two days ago: ${twoDaysAgo}`);

    // 1. Check Mallikarjun
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .ilike('name', '%Mallikarjun%');
    
    if (userError) throw userError;
    console.log('\nMallikarjun User Records:', JSON.stringify(users, null, 2));

    if (!users || users.length === 0) {
      console.log('No user found');
      return;
    }
    const malliId = users[0].id;

    // 2. Check reel tasks
    const { data: reelTasks, error: reelError } = await supabase
      .from('reel_tasks')
      .select('*, deliveries(*)')
      .eq('assigned_user_id', malliId);

    if (reelError) throw reelError;
    console.log('\nAll Reel Tasks for Mallikarjun:', JSON.stringify(reelTasks, null, 2));

    // 3. Sim Audit Filtered
    const { data: backlog, error: backlogError } = await supabase
      .from('reel_tasks')
      .select('*, deliveries!inner(*)')
      .eq('status', 'PENDING')
      .lte('deliveries.date', two_days_ago);

    if (backlogError) throw backlogError;
    console.log('\nBacklog (PENDING & <= ' + two_days_ago + '):', JSON.stringify(backlog, null, 2));

  } catch (err) {
    console.error('DEBUG ERROR:', err);
  }
}

debug();
