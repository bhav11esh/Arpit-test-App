import { createClient } from '@supabase/supabase-client';
import * as dotenv from 'dotenv';
dotenv.config();

const client = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!);

async function check() {
  const { data: dealers } = await client.from('dealerships').select('*').ilike('name', '%APPLE%');
  console.log('Dealers:', JSON.stringify(dealers, null, 2));
  
  const { data: mappings } = await client.from('photographer_mappings').select('*');
  console.log('Mappings count:', mappings?.length);
  
  const appleMappings = mappings?.filter(m => dealers?.some(d => d.id === m.dealership_id));
  console.log('Apple Mappings:', JSON.stringify(appleMappings, null, 2));
}

check();
