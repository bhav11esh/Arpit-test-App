
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

async function checkFunction() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Try to get the function definition
  const { data, error } = await supabase.rpc('pg_get_functiondef', { func_name: 'public.run_system_audit(date)' });

  if (error) {
    console.error('ERROR:', error);
    // Fallback search
    const { data: searchData, error: searchError } = await supabase
      .from('pg_proc')
      .select('prosrc')
      .ilike('proname', 'run_system_audit');
    if (searchError) {
       console.error('Search error:', searchError);
    } else {
       console.log('Function Source:', searchData[0]?.prosrc);
    }
  } else {
    console.log('Function Definition:');
    console.log(data);
  }
}

checkFunction();
