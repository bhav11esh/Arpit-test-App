import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function listNullUrls() {
  const { data, error } = await supabase
    .from('dealerships')
    .select('name, google_sync_url')
    .is('google_sync_url', null);

  if (error) return;

  const names = data.map(d => d.name);
  console.log('NULL_URL_LIST:' + JSON.stringify(names));
}

listNullUrls();
