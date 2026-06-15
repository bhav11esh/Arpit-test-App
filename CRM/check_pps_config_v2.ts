import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkConfig() {
  console.log('Checking dealerships config...');
  const { data, error } = await supabase
    .from('dealerships')
    .select('*');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const pps = data.find(d => d.id === 'PPS_MAHINDRA' || d.showroom_code === 'PPS_MAHINDRA' || d.name === 'PPS Mahindra');
  console.log('PPS Mahindra Config:', pps);
}

checkConfig();
