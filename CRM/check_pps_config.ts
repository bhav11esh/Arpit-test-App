import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkConfig() {
  console.log('Checking dealerships config for PPS_MAHINDRA...');
  const { data, error } = await supabase
    .from('dealerships')
    .select('*')
    .eq('id', 'PPS_MAHINDRA')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Current Config:', data);
}

checkConfig();
