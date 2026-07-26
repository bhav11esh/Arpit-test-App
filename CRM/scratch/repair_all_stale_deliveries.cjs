const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function repairAllStale() {
  console.log('--- REPAIRING ALL STALE DELIVERIES WITHOUT REEL TASKS ---');

  // 1. Fetch all DONE deliveries <= '2026-05-21'
  const { data: deliveries, error: dError } = await supabase
    .from('deliveries')
    .select('*')
    .eq('status', 'DONE')
    .lte('date', '2026-05-21');

  if (dError) {
    console.error('Error fetching deliveries:', dError);
    return;
  }

  // Filter deliveries missing reel links and having an assigned photographer
  const staleDeliveries = deliveries.filter(d => 
    (!d.reel_link || d.reel_link.trim() === '' || d.reel_link.toLowerCase().includes('pending')) &&
    d.assigned_user_id !== null
  );

  console.log(`Found ${staleDeliveries.length} completed, assigned stale deliveries to check.`);

  // 2. Fetch existing reel tasks to filter out duplicates
  const deliveryIds = staleDeliveries.map(d => d.id);
  const existingTaskIds = new Set();
  
  if (deliveryIds.length > 0) {
    const chunkSize = 50;
    for (let i = 0; i < deliveryIds.length; i += chunkSize) {
      const chunk = deliveryIds.slice(i, i + chunkSize);
      const { data: tasks, error: tError } = await supabase
        .from('reel_tasks')
        .select('delivery_id')
        .in('delivery_id', chunk);
        
      if (tError) {
        console.error('Error checking tasks:', tError);
      } else if (tasks) {
        tasks.forEach(t => existingTaskIds.add(t.delivery_id));
      }
    }
  }

  const missingDeliveries = staleDeliveries.filter(d => !existingTaskIds.has(d.id));
  console.log(`Identified ${missingDeliveries.length} deliveries that completely lack reel tasks.`);

  // 3. Create missing reel tasks
  for (const delivery of missingDeliveries) {
    const [year, month, day] = delivery.date.split('-').map(Number);
    const deadlineDate = new Date(year, month - 1, day, 23, 59, 59);
    if (delivery.received_amount === 700) {
      deadlineDate.setDate(deadlineDate.getDate() + 1);
    }
    const deadline = deadlineDate.toISOString();

    console.log(`⏳ Creating reel task for ${delivery.delivery_name} (${delivery.date}) - Photographer ID: ${delivery.assigned_user_id}`);

    const { data: insertedTask, error: insertError } = await supabase
      .from('reel_tasks')
      .insert({
        delivery_id: delivery.id,
        assigned_user_id: delivery.assigned_user_id,
        status: 'PENDING',
        deadline: deadline,
        reel_link: null
      })
      .select();

    if (insertError) {
      console.error(`❌ Failed to create task:`, insertError.message);
    } else {
      console.log(`✨ Created task: ID ${insertedTask[0].id}`);
    }
  }

  // 4. Trigger refresh_post_its RPC
  console.log('\n🔄 Triggering refresh_post_its RPC...');
  const { error: rpcError } = await supabase.rpc('refresh_post_its');
  if (rpcError) {
    console.error('❌ Failed to run refresh_post_its RPC:', rpcError);
  } else {
    console.log('✅ Successfully ran refresh_post_its RPC.');
  }

  console.log('--- REPAIR COMPLETE ---');
}

repairAllStale();
