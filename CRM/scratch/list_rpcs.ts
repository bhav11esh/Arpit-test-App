import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();
dotenv.config({ path: path.join(process.cwd(), '..', '.env') });
dotenv.config({ path: path.join(process.cwd(), 'CRM', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listRpcs() {
  const { data, error } = await supabase
    .from('pgrst_rpc') // PostgREST internal table for RPCs
    .select('*');
    
  if (error) {
    // If that fails, try another way
    const { data: data2, error: error2 } = await supabase.rpc('get_table_info', { table_name: 'users' });
    console.log('RPC exists check:', !error2);
    return;
  }

  console.log(JSON.stringify(data, null, 2));
}

listRpcs();
