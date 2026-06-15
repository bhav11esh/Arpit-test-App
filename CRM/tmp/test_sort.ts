import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function simulate() {
  const malliId = 'bc268775-f79f-4400-b10b-bea4ba1dc762';
  
  const { data: mappings } = await supabase.from('mappings').select('*');
  const { data: dealerships } = await supabase.from('dealerships').select('*');

  // Convert to camelCase as the app does
  const appMappings = mappings!.map(m => ({
    dealershipId: m.dealership_id,
    clusterId: m.cluster_id,
    photographerId: m.photographer_id,
    mappingType: m.mapping_type
  }));

  const myPrimaryId = appMappings.find(m => m.photographerId === malliId && m.mappingType === 'PRIMARY')?.dealershipId;
  console.log('myPrimaryId:', myPrimaryId);

  const clusterDealerships = dealerships!.filter(d => {
      return appMappings.some(m => m.dealershipId === d.id && m.clusterId === 'f04b406f-48ee-489a-88a5-f7fec926ccc4');
  });

  console.log('Before sort:', clusterDealerships.map(d => d.name));

  if (myPrimaryId) {
    clusterDealerships.sort((a, b) => {
      if (a.id === myPrimaryId) return -1;
      if (b.id === myPrimaryId) return 1;
      return 0;
    });
  }

  console.log('After sort:', clusterDealerships.map(d => d.name));
}

simulate();
