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

async function runAudit() {
  const today = '2026-04-26';
  const { data, error } = await supabase.rpc('run_system_audit', { target_date: today });

  if (error) {
    console.error('RPC Error:', error);
    return;
  }

  console.log('--- AUDIT RESULTS ---');
  console.log(JSON.stringify(data, null, 2));

  // Find Venkatesh in results
  const venkatesh = (data as any).missingUpdates?.find((u: any) => u.name.includes('Venkatesh'));
  if (venkatesh) {
    console.log('\n--- VENKATESH AUDIT ---');
    console.log(JSON.stringify(venkatesh, null, 2));
  } else {
    console.log('\nVenkatesh not found in missingUpdates');
  }
}

runAudit();
