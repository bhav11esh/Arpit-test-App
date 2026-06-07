import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFilter() {
  const { data: mappingsData } = await supabase.from('mappings').select('*');
  const { data: dealershipsData } = await supabase.from('dealerships').select('*');
  const { data: clustersData } = await supabase.from('clusters').select('*');

  // Mimic the rowToMapping logic
  const mappings = mappingsData?.map(row => ({
    id: row.id,
    clusterId: row.cluster_id,
    dealershipId: row.dealership_id,
    photographerId: row.photographer_id,
    mappingType: row.mapping_type,
    latitude: row.latitude ?? 0,
    longitude: row.longitude ?? 0,
  })) || [];

  const dealerships = dealershipsData?.map(row => ({
    id: row.id,
    name: row.name,
    paymentType: row.payment_type,
  })) || [];

  const hosurCluster = clustersData?.find(c => c.name.includes('Hosur'));
  if (!hosurCluster) {
    console.log('Hosur cluster not found');
    return;
  }

  const selectedExternalCluster = hosurCluster.id;

  const filtered = dealerships.filter(d => 
    !selectedExternalCluster || mappings.some(m => m.clusterId === selectedExternalCluster && m.dealershipId === d.id)
  );

  console.log(`Original dealerships count: ${dealerships.length}`);
  console.log(`Filtered dealerships count for ${hosurCluster.name} (${hosurCluster.id}): ${filtered.length}`);
  console.log('Filtered dealerships names:');
  console.log(filtered.map(d => d.name));
}

testFilter().catch(console.error);
