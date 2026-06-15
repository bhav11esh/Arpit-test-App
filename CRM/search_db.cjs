const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
const target = '15W2h5GAgVeMPGCscmX';

async function search() {
  const tables = ['dealerships', 'clusters', 'mappings', 'users', 'reels', 'deliveries'];
  let found = false;

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(2000);
      if (error) {
        console.error(`Error fetching ${table}:`, error.message);
        continue;
      }

      for (const row of data) {
        for (const [key, value] of Object.entries(row)) {
          if (typeof value === 'string' && value.includes(target)) {
            console.log(`FOUND in table '${table}', column '${key}', row ID: ${row.id}`);
            console.log('Value:', value);
            found = true;
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  if (!found) {
    console.log('NOT FOUND ANYWHERE in the top tables.');
  }
}

search();
