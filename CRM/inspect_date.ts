
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

const logFile = 'date_debug_log.txt';
function log(msg: string) {
  console.log(msg);
  fs.appendFileSync(logFile, msg + '\n');
}

async function debug() {
  if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
  log('Starting Date Comparison Debug...');

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const targetDate = '2026-04-12';
    const twoDaysAgo = '2026-04-10';

    log(`Target: ${targetDate}, 2 days ago: ${twoDaysAgo}`);

    // Query exactly like the RPC
    const { data, error } = await supabase
      .from('reel_tasks')
      .select('*, deliveries!inner(*)')
      .eq('status', 'PENDING')
      .lte('deliveries.date', twoDaysAgo);

    if (error) throw error;

    log(`Found ${data.length} pending items matching date <= ${twoDaysAgo}`);
    if (data.length > 0) {
      log(JSON.stringify(data.map(d => ({
        id: d.id,
        date: d.deliveries.date,
        name: d.deliveries.delivery_name
      })), null, 2));
    }

  } catch (err: any) {
    log(`ERROR: ${err.message}`);
  }
}

debug();
