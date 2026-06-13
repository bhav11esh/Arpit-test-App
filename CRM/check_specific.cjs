const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  const { data: d, error } = await supabase
    .from('deliveries')
    .select('id, delivery_name, reel_link, status, footage_link')
    .eq('date', '2026-05-04')
    .like('delivery_name', '%KATARIA_NEXA%');
    
  if (error) {
    console.error(error);
    return;
  }
  
  console.log("Deliveries found for 04-05-2026 Kataria Nexa:");
  for (let i = 0; i < d.length; i++) {
    console.log(`\nDelivery ${i+1}:`);
    console.log(d[i]);
    
    const { data: rt } = await supabase
      .from('reel_tasks')
      .select('id, status, is_post_it, reel_link')
      .eq('delivery_id', d[i].id);
      
    if (rt && rt.length > 0) {
      console.log(`Reel Tasks:`, rt);
    } else {
      console.log(`No reel task.`);
    }
  }
}

run();
