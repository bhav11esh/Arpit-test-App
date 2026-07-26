const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function repair() {
  console.log('--- REPAIRING SKODA MAY 8 DELIVERIES ---');

  // 1. Fetch the 6 Skoda Karr deliveries on 2026-05-08
  const { data: deliveries, error: dError } = await supabase
    .from('deliveries')
    .select('*')
    .eq('date', '2026-05-08')
    .ilike('delivery_name', '%Skoda%');

  if (dError) {
    console.error('Error fetching deliveries:', dError);
    return;
  }

  console.log(`Found ${deliveries.length} Skoda deliveries to repair.`);

  for (const delivery of deliveries) {
    // Check if task already exists
    const { data: existingTask, error: tError } = await supabase
      .from('reel_tasks')
      .select('*')
      .eq('delivery_id', delivery.id)
      .maybeSingle();

    if (existingTask) {
      console.log(`✅ Reel task already exists for delivery: ${delivery.delivery_name}`);
      continue;
    }

    // Calculate deadline
    const [year, month, day] = delivery.date.split('-').map(Number);
    const deadlineDate = new Date(year, month - 1, day, 23, 59, 59);
    if (delivery.received_amount === 700) {
      deadlineDate.setDate(deadlineDate.getDate() + 1);
    }
    const deadline = deadlineDate.toISOString();

    const isResolved = delivery.reel_link !== null;
    const taskStatus = isResolved ? 'RESOLVED' : 'PENDING';

    console.log(`⏳ Creating reel task for ${delivery.delivery_name} (Status: ${taskStatus}, Assigned: ${delivery.assigned_user_id})`);

    const { data: insertedTask, error: insertError } = await supabase
      .from('reel_tasks')
      .insert({
        delivery_id: delivery.id,
        assigned_user_id: delivery.assigned_user_id,
        status: taskStatus,
        deadline: deadline,
        reel_link: delivery.reel_link
      })
      .select();

    if (insertError) {
      console.error(`❌ Failed to create task for ${delivery.delivery_name}:`, insertError.message);
    } else {
      console.log(`✨ Successfully created task: ID ${insertedTask[0].id}`);
    }
  }

  // 2. Trigger refreshPostIts (runs refresh_post_its RPC)
  console.log('\n🔄 Triggering refresh_post_its RPC...');
  const { error: rpcError } = await supabase.rpc('refresh_post_its');
  if (rpcError) {
    console.error('❌ Failed to run refresh_post_its RPC:', rpcError);
  } else {
    console.log('✅ successfully ran refresh_post_its RPC.');
  }

  // 3. Inspect final state of reel tasks for these deliveries
  console.log('\n--- VERIFYING FINAL STATE ---');
  const deliveryIds = deliveries.map(d => d.id);
  const { data: finalTasks, error: fError } = await supabase
    .from('reel_tasks')
    .select('*, deliveries(*)')
    .in('delivery_id', deliveryIds);

  if (fError) {
    console.error('Error fetching final tasks:', fError);
    return;
  }

  console.log(`Found ${finalTasks.length} tasks after repair:`);
  finalTasks.forEach(t => {
    console.log(`- Task ID: ${t.id}, Name: ${t.deliveries?.delivery_name}, Status: ${t.status}, Assigned User: ${t.assigned_user_id}, Is Post-it: ${t.is_post_it}, Reward: ${t.post_it_reward}`);
  });

  console.log('--- REPAIR COMPLETE ---');
}

repair();
