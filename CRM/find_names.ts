import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function findNames() {
  const showroomCode = 'NANDI_TOYOTA';
  const { data: deliveries, count } = await supabase
    .from('deliveries')
    .select('id, date, delivery_name')
    .eq('showroom_code', showroomCode);

  if (deliveries) {
    const suspect1 = deliveries.find(d => d.delivery_name?.includes('Nisha Manjunath'));
    const suspect2 = deliveries.find(d => d.delivery_name?.includes('Shehjar Kaul Sahoo'));
    
    console.log('Suspect 1 (Nisha):', suspect1);
    console.log('Suspect 2 (Shehjar):', suspect2);
  }
}

findNames();
