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

async function check() {
  const { data: clusters } = await supabase.from('clusters').select('*').ilike('name', '%Hosur%');
  console.log('Clusters:', clusters);
  if (!clusters || clusters.length === 0) return;

  const clusterId = clusters[0].id;
  const { data: mappings } = await supabase.from('mappings').select('dealership_id').eq('cluster_id', clusterId);
  console.log('Mappings count:', mappings?.length);

  if (mappings && mappings.length > 0) {
    const dIds = mappings.map(m => m.dealership_id);
    const { data: dealerships } = await supabase.from('dealerships').select('name').in('id', dIds);
    console.log('Dealerships in Hosur Road:', dealerships?.map(d => d.name));
  }
}

check().catch(console.error);
