import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function findNandiCoordinates() {
  let output = '';
  const log = (msg: string) => {
    console.log(msg);
    output += msg + '\n';
  };

  log('Searching for Nandi Toyota in dealerships...');
  const { data: dealerships, error: dError } = await supabase
    .from('dealerships')
    .select('*')
    .ilike('name', '%Nandi Toyota%');

  if (dError) log('Error fetching dealerships: ' + JSON.stringify(dError));
  else {
    log('Dealerships found: ' + JSON.stringify(dealerships, null, 2));
  }

  log('\nSearching for Whitefield in clusters...');
  const { data: clusters, error: cError } = await supabase
    .from('clusters')
    .select('*')
    .ilike('name', '%Whitefield%');

  if (cError) log('Error fetching clusters: ' + JSON.stringify(cError));
  else {
    log('Clusters found: ' + JSON.stringify(clusters, null, 2));
  }
  
  log('\nSearching for any mappings related to these dealership ids...');
  if (dealerships && dealerships.length > 0) {
    const dIds = dealerships.map(d => d.id);
    const { data: mappings, error: mError } = await supabase
      .from('mappings')
      .select('*, dealerships(name), clusters(name)')
      .in('dealership_id', dIds);
      
    if (mError) log('Error fetching mappings: ' + JSON.stringify(mError));
    else {
      log('Mappings found: ' + JSON.stringify(mappings, null, 2));
    }
  }

  fs.writeFileSync('nandi_coords_debug.txt', output);
  console.log('Output written to nandi_coords_debug.txt');
}

findNandiCoordinates();
