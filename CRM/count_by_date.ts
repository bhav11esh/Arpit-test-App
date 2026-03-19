import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function countByDate() {
  const showroomCode = 'NANDI_TOYOTA';
  const { data, error } = await supabase.from('deliveries').select('date').eq('showroom_code', showroomCode);
  
  if (error) {
    console.error('Error:', error);
    return;
  }

  const counts: Record<string, number> = {};
  data.forEach(r => {
    counts[r.date] = (counts[r.date] || 0) + 1;
  });

  const sortedDates = Object.keys(counts).sort();
  console.log('Date Counts for Nandi Toyota:');
  sortedDates.forEach(date => {
    console.log(`${date}: ${counts[date]}`);
  });
  
  console.log(`\nTotal Records: ${data.length}`);
}

countByDate();
