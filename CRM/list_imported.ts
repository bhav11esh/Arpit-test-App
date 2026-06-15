import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

async function checkImported() {
  const showroomCode = 'NANDI_TOYOTA';
  const { data: deliveries, count } = await supabase
    .from('deliveries')
    .select('id, date, delivery_name')
    .eq('showroom_code', showroomCode)
    .order('date', { ascending: true });

  const output: string[] = [];
  output.push(`Total records for ${showroomCode}: ${count}`);
  
  if (deliveries) {
    const suspicious = deliveries.filter(d => 
        !d.delivery_name || 
        d.delivery_name.includes('IMPORTED_') ||
        d.delivery_name.toLowerCase().includes('date') ||
        !d.date
    );
    output.push(`Suspicious Count: ${suspicious.length}`);
    output.push(JSON.stringify(suspicious, null, 2));

    output.push('\nFirst 5:');
    output.push(JSON.stringify(deliveries.slice(0, 5), null, 2));

    output.push('\nLast 5:');
    output.push(JSON.stringify(deliveries.slice(-5), null, 2));
  }
  
  fs.writeFileSync('output.txt', output.join('\n'));
}

checkImported();
