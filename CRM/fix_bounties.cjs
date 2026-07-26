const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing env variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log('Fetching deliveries with reel links...');
  let allDeliveries = [];
  let from = 0;
  const step = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('deliveries')
      .select('id, reel_link, status')
      .not('reel_link', 'is', null)
      .neq('reel_link', '')
      .range(from, from + step - 1);
      
    if (error) throw error;
    if (data.length === 0) break;
    
    allDeliveries = allDeliveries.concat(data);
    from += step;
  }
  console.log(`Found ${allDeliveries.length} deliveries with reel links.`);

  console.log('Fetching reel tasks...');
  let allTasks = [];
  from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('reel_tasks')
      .select('id, delivery_id, status, is_post_it, reel_link')
      .range(from, from + step - 1);
      
    if (error) throw error;
    if (data.length === 0) break;
    
    allTasks = allTasks.concat(data);
    from += step;
  }
  console.log(`Found ${allTasks.length} reel tasks.`);

  const tasksMap = {};
  for (const t of allTasks) tasksMap[t.delivery_id] = t;

  let fixedCount = 0;
  for (const d of allDeliveries) {
    const t = tasksMap[d.id];
    if (t) {
      if (t.status !== 'RESOLVED' || t.is_post_it || t.reel_link !== d.reel_link) {
        console.log(`Fixing task ${t.id} for delivery ${d.id}...`);
        const { error } = await supabase
          .from('reel_tasks')
          .update({
            status: 'RESOLVED',
            is_post_it: false,
            reel_link: d.reel_link
          })
          .eq('id', t.id);
          
        if (error) {
          console.error(`Failed to update task ${t.id}:`, error);
        } else {
          fixedCount++;
        }
      }
    }
  }
  
  console.log(`Fixed ${fixedCount} out-of-sync reel tasks.`);
}

run().catch(console.error);
