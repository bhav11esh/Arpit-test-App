const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  console.log('--- DB INSPECTION START ---');
  
  // 1. Find Sathick
  const { data: users, error: uError } = await supabase
    .from('users')
    .select('*')
    .ilike('name', '%Sathick%');
    
  if (uError) {
    console.error('Error fetching users:', uError);
    return;
  }
  
  console.log('Photographers matching Sathick:');
  console.log(users);
  
  if (users.length === 0) {
    console.log('No user found matching Sathick');
    return;
  }
  
  const sathickId = users[0].id;
  
  // 2. Query deliveries on 2026-05-08
  console.log('\nQuerying deliveries on 2026-05-08...');
  const { data: deliveries, error: dError } = await supabase
    .from('deliveries')
    .select('*')
    .eq('date', '2026-05-08');
    
  if (dError) {
    console.error('Error fetching deliveries:', dError);
    return;
  }
  
  console.log(`Found ${deliveries.length} deliveries on 2026-05-08:`);
  deliveries.forEach(d => {
    console.log(`- ID: ${d.id}, Name: ${d.delivery_name}, Showroom: ${d.showroom_code}, Assigned: ${d.assigned_user_id}, Status: ${d.status}, Footage: ${d.footage_link}, Reel: ${d.reel_link}`);
  });
  
  // 3. Query all deliveries for showroom PPS_SKODA or containing Skoda on 2026-05-08
  console.log('\nQuerying Skoda deliveries specifically...');
  const { data: skodaDeliveries, error: sdError } = await supabase
    .from('deliveries')
    .select('*')
    .ilike('delivery_name', '%Skoda%')
    .eq('date', '2026-05-08');
    
  if (sdError) {
    console.error('Error fetching Skoda deliveries:', sdError);
    return;
  }
  console.log(`Found ${skodaDeliveries.length} Skoda deliveries on 2026-05-08:`);
  skodaDeliveries.forEach(d => {
    console.log(`- ID: ${d.id}, Name: ${d.delivery_name}, Showroom: ${d.showroom_code}, Assigned: ${d.assigned_user_id}, Status: ${d.status}, Footage: ${d.footage_link}, Reel: ${d.reel_link}`);
  });

  // 4. Query reel tasks for these deliveries
  const deliveryIds = deliveries.map(d => d.id);
  if (deliveryIds.length > 0) {
    console.log('\nQuerying reel tasks for 2026-05-08 deliveries...');
    const { data: reelTasks, error: rError } = await supabase
      .from('reel_tasks')
      .select('*')
      .in('delivery_id', deliveryIds);
      
    if (rError) {
      console.error('Error fetching reel tasks:', rError);
      return;
    }
    
    console.log(`Found ${reelTasks.length} reel tasks:`);
    reelTasks.forEach(t => {
      console.log(`- Task ID: ${t.id}, Delivery ID: ${t.delivery_id}, Assigned User: ${t.assigned_user_id}, Status: ${t.status}, Is Post-it: ${t.is_post_it}, Created: ${t.created_at}`);
    });
  }

  // 5. Query reel tasks specifically assigned to Sathick or with status PENDING/Post-it
  console.log('\nQuerying all reel tasks for Sathick...');
  const { data: sathickTasks, error: stError } = await supabase
    .from('reel_tasks')
    .select('*, deliveries(*)')
    .eq('assigned_user_id', sathickId);
    
  if (stError) {
    console.error('Error fetching Sathick reel tasks:', stError);
    return;
  }
  console.log(`Found ${sathickTasks.length} reel tasks assigned to Sathick:`);
  sathickTasks.forEach(t => {
    console.log(`- Task ID: ${t.id}, Delivery: ${t.deliveries?.delivery_name}, Status: ${t.status}, Is Post-it: ${t.is_post_it}, Date: ${t.deliveries?.date}`);
  });

  console.log('--- DB INSPECTION END ---');
}

inspect();
