const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log('Fetching deliveries that are NOT DONE...');
  let allInvalidDeliveries = [];
  let from = 0;
  const step = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('deliveries')
      .select('id, status')
      .neq('status', 'DONE')
      .range(from, from + step - 1);
      
    if (error) throw error;
    if (data.length === 0) break;
    
    allInvalidDeliveries = allInvalidDeliveries.concat(data);
    from += step;
  }
  
  const invalidDeliveryIds = new Set(allInvalidDeliveries.map(d => d.id));
  console.log(`Found ${invalidDeliveryIds.size} deliveries that are NOT DONE.`);

  console.log('Fetching all reel tasks...');
  let allTasks = [];
  from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('reel_tasks')
      .select('id, delivery_id')
      .range(from, from + step - 1);
      
    if (error) throw error;
    if (data.length === 0) break;
    
    allTasks = allTasks.concat(data);
    from += step;
  }
  
  const tasksToDelete = allTasks.filter(t => invalidDeliveryIds.has(t.delivery_id));
  console.log(`Found ${tasksToDelete.length} invalid reel tasks to delete.`);
  
  if (tasksToDelete.length > 0) {
    const taskIds = tasksToDelete.map(t => t.id);
    let deletedCount = 0;
    
    for (let i = 0; i < taskIds.length; i += 100) {
      const chunk = taskIds.slice(i, i + 100);
      const { error } = await supabase
        .from('reel_tasks')
        .delete()
        .in('id', chunk);
        
      if (error) {
        console.error('Failed to delete chunk:', error);
      } else {
        deletedCount += chunk.length;
      }
    }
    console.log(`Successfully deleted ${deletedCount} invalid reel tasks.`);
  }
}

run().catch(console.error);
