
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

const logFile = 'debug_log.txt';
function log(msg: string) {
  console.log(msg);
  fs.appendFileSync(logFile, msg + '\n');
}

async function debug() {
  if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
  log('Starting debug...');

  if (!supabaseUrl || !supabaseKey) {
    log('Missing env vars');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const targetDate = '2026-04-12';
    const twoDaysAgo = '2026-04-10';

    log(`Checking for target date: ${targetDate}`);
    log(`Two days ago: ${twoDaysAgo}`);

    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .ilike('name', '%Mallikarjun%');
    
    if (userError) throw userError;
    log(`Users found: ${users.length}`);
    log(JSON.stringify(users, null, 2));

    if (users.length > 0) {
      const malliId = users[0].id;
      const { data: reelTasks, error: reelError } = await supabase
        .from('reel_tasks')
        .select('*, deliveries(*)')
        .eq('assigned_user_id', malliId);

      if (reelError) throw reelError;
      log(`Reel tasks for Mallikarjun: ${reelTasks.length}`);
      log(JSON.stringify(reelTasks.map(t => ({
        id: t.id,
        status: t.status,
        date: t.deliveries.date,
        name: t.deliveries.delivery_name
      })), null, 2));
    }

    const { data: backlog, error: backlogError } = await supabase
      .from('reel_tasks')
      .select('*, deliveries!inner(*)')
      .eq('status', 'PENDING')
      .lte('deliveries.date', two_days_ago);

    if (backlogError) throw backlogError;
    log(`Total backlog count: ${backlog.length}`);
    log(JSON.stringify(backlog.map(b => b.id), null, 2));

  } catch (err: any) {
    log(`ERROR: ${err.message}`);
    log(JSON.stringify(err, null, 2));
  }
}

debug();
