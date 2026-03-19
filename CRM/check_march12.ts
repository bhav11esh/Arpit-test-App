import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function checkDate() {
  const showroomCode = 'NANDI_TOYOTA';
  
  const { data: d1 } = await supabase
    .from('deliveries')
    .select('id, date, delivery_name')
    .eq('showroom_code', showroomCode)
    .eq('date', '2026-03-12');

  console.log(`Records for 2026-03-12:`, d1?.length);
  if (d1?.length) console.table(d1);

  const { data: d2 } = await supabase
    .from('deliveries')
    .select('id, date, delivery_name')
    .eq('showroom_code', showroomCode)
    .eq('date', '2026-12-03');

  console.log(`Records for 2026-12-03:`, d2?.length);
  if (d2?.length) console.table(d2);
}

checkDate();
