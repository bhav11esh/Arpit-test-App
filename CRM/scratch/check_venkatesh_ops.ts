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

async function checkVenkateshDeliveries() {
  const userId = '1667a3a2-fa08-4127-aafd-4c41a5532d0b';
  const today = '2026-04-26';
  
  const { data, error } = await supabase
    .from('deliveries')
    .select('*')
    .eq('assigned_user_id', userId)
    .eq('date', today);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`--- DELIVERIES ASSIGNED TO VENKATESH ON ${today} ---`);
  console.log(JSON.stringify(data, null, 2));

  // Check for unassigned deliveries that WERE his
  const { data: unassigned, error: uError } = await supabase
    .from('deliveries')
    .select('*')
    .eq('date', today)
    .eq('status', 'UNASSIGNED')
    .ilike('unassignment_reason', '%Leave applied%');

  if (uError) {
    console.error('Error fetching unassigned:', uError);
    return;
  }

  console.log(`\n--- UNASSIGNED DELIVERIES (POTENTIALLY DUE TO LEAVE) ---`);
  console.log(JSON.stringify(unassigned, null, 2));
}

checkVenkateshDeliveries();
