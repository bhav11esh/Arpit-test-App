
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

const logFile = 'rpc_debug_log.txt';
function log(msg: string) {
  console.log(msg);
  fs.appendFileSync(logFile, msg + '\n');
}

async function debug() {
  if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
  log('Starting RPC debug...');

  const supabase = createClient(supabaseUrl, supabaseKey);

  const targetDate = '2026-04-12';
  
  log(`Calling run_system_audit for ${targetDate}...`);
  const { data, error } = await supabase.rpc('run_system_audit', { target_date: targetDate });

  if (error) {
    log(`RPC ERROR: ${JSON.stringify(error, null, 2)}`);
  } else {
    log('RPC SUCCESS:');
    log(JSON.stringify(data, null, 2));
  }
}

debug();
