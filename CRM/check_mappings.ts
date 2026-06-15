import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function checkMappings() {
  const { data: dealerships, error: dError } = await supabase
    .from('dealerships')
    .select('id, name')
    .ilike('name', '%nandi%');

  if (dError) {
    console.error('Dealership error:', dError);
    return;
  }

  if (!dealerships || dealerships.length === 0) {
    console.log('No Nandi dealerships found.');
    return;
  }

  for (const d of dealerships) {
    console.log(`\nChecking Dealership: ${d.name} (${d.id})`);
    const { data: mappings, error: mError } = await supabase
      .from('mappings')
      .select('*')
      .eq('dealership_id', d.id);

    if (mError) {
      console.error(`Mapping error for ${d.name}:`, mError);
      continue;
    }

    console.log('Mappings:');
    console.table(mappings);
  }
}

checkMappings();
