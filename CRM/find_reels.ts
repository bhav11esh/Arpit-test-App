import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function findReelLinks() {
  const showroomCode = 'NANDI_TOYOTA';

  const { data: d1 } = await supabase
    .from('deliveries')
    .select('id, date, delivery_name, reel_link')
    .in('delivery_name', ['Nisha Manjunath ', 'Shehjar Kaul Sahoo']);

  console.log(`Nisha and Shehjar Records:`);
  console.table(d1);

  // Check what happened to March 12th records (the user thought they were there)
  // Let's search by reel links if the user provided them... wait they didn't.
  // Let's just find anything with 12 and 03
  const { data: d2 } = await supabase
    .from('deliveries')
    .select('id, date, delivery_name, reel_link')
    .eq('showroom_code', showroomCode)
    .like('date', '%03%12%');

  const { data: d3 } = await supabase
    .from('deliveries')
    .select('id, date, delivery_name, reel_link')
    .eq('showroom_code', showroomCode)
    .like('date', '%12%03%');

  console.log(`Any 03-12 matches:`, d2?.length);
  console.log(`Any 12-03 matches:`, d3?.length);
}

findReelLinks();
