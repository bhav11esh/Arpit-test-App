import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function countRooms() {
  const { data, error } = await supabase.from('deliveries').select('showroom_code');
  if (error) {
    console.error('Error:', error);
    return;
  }
  const counts: Record<string, number> = {};
  data.forEach((r: any) => {
    const code = r.showroom_code || 'NULL';
    counts[code] = (counts[code] || 0) + 1;
  });
  console.table(counts);
}

countRooms();
