import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || ''; // If this is failing, I might need the service role key for schema info
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
  const tables = ['users', 'clusters', 'dealerships'];
  
  for (const table of tables) {
    console.log(`\n--- Schema for ${table} ---`);
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);
    
    if (error) {
      console.error(`Error fetching ${table}:`, error.message);
    } else if (data && data.length > 0) {
      console.log('Columns:', JSON.stringify(Object.keys(data[0]), null, 2));
    } else {
       console.log('No data found to inspect columns.');
    }
  }
}

inspectSchema();
