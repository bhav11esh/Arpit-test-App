const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function findMissingTasks() {
  // Fetch all DONE deliveries
  const { data: deliveries, error: dError } = await supabase
    .from('deliveries')
    .select('*')
    .eq('status', 'DONE');
    
  if (dError) {
    console.error('Error fetching deliveries:', dError);
    return;
  }
  
  console.log(`Total DONE deliveries: ${deliveries.length}`);
  
  // Fetch all reel tasks
  const { data: reelTasks, error: rError } = await supabase
    .from('reel_tasks')
    .select('delivery_id');
    
  if (rError) {
    console.error('Error fetching reel tasks:', rError);
    return;
  }
  
  console.log(`Total reel tasks: ${reelTasks.length}`);
  
  const existingDeliveryIds = new Set(reelTasks.map(t => t.delivery_id));
  
  const missing = deliveries.filter(d => !existingDeliveryIds.has(d.id));
  
  console.log(`Found ${missing.length} DONE deliveries with missing reel tasks:`);
  missing.forEach(d => {
    console.log(`- Date: ${d.date}, Name: ${d.delivery_name}, Showroom: ${d.showroom_code}, Assigned: ${d.assigned_user_id}, Footage: ${d.footage_link}, Reel: ${d.reel_link}`);
  });
}

findMissingTasks();
