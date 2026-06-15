import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const { data: dealerships, error: dError } = await supabase
    .from('dealerships')
    .select('*')
    .ilike('name', '%Akshaya Mercedes%');

  if (dError) {
    console.error('Error fetching dealership:', dError);
    return;
  }

  if (dealerships.length > 0) {
    const showroomName = dealerships[0].name;
    const matches = showroomName.match(/\(([^)]+)\)/);
    const showroomCode = matches ? matches[1].toUpperCase() : showroomName.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    
    console.log('Using showroom_code:', showroomCode);

    const { data: deliveries, error: delError } = await supabase
      .from('deliveries')
      .select('*')
      .eq('showroom_code', showroomCode)
      .order('date', { ascending: true });

    if (delError) {
      console.error('Error fetching deliveries:', delError);
      return;
    }

    fs.writeFileSync('akshaya_data.json', JSON.stringify(deliveries, null, 2));
    console.log(`Saved ${deliveries.length} deliveries to akshaya_data.json`);
  }
}

checkData();
