import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function verifySlice() {
  const dates = [
    '2026-03-06', '2026-03-07', '2026-03-08',
    '2026-03-11', '2026-03-12', '2026-03-13',
    '2026-03-14'
  ];

  const { data, error } = await supabase
    .from('deliveries')
    .select('date, delivery_name, reel_link, showroom_code')
    .eq('showroom_code', 'NANDI_TOYOTA')
    .in('date', dates)
    .order('date', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('--- DATABASE RECORDS FOR SCREENSHOT DATES ---');
  console.table(data);
  
  // Also count by date in this range
  const counts: Record<string, number> = {};
  data?.forEach(r => {
    counts[r.date] = (counts[r.date] || 0) + 1;
  });
  console.log('Counts by Date:');
  console.log(counts);
}

verifySlice();
