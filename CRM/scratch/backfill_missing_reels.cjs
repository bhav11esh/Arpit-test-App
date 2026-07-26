const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config({ path: 'c:/Users/dell/Desktop/App codes/Arpit-test-App/CRM/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function backfill() {
  const fourDaysAgo = new Date();
  fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
  const dateStr = fourDaysAgo.toISOString().split('T')[0];

  console.log(`Fetching deliveries before ${dateStr} with missing reel links...`);

  const { data: deliveries, error } = await supabase
    .from('deliveries')
    .select(`
      id,
      date,
      assigned_user_id,
      showroom_code,
      footage_link,
      reel_link,
      delivery_name,
      received_amount
    `)
    .lte('date', dateStr)
    .is('reel_link', null);

  if (error) {
    console.error('Error fetching deliveries:', error);
    return;
  }

  const missingReels = deliveries.filter(d => !d.reel_link || d.reel_link.trim() === '');
  console.log(`Found ${missingReels.length} deliveries missing reel links older than 4 days.`);

  let createdCount = 0;

  for (const delivery of missingReels) {
    // Check if task exists
    const { data: existingTask, error: tError } = await supabase
        .from('reel_tasks')
        .select('*')
        .eq('delivery_id', delivery.id)
        .maybeSingle();

    if (tError) {
      console.error(`Error checking task for ${delivery.id}:`, tError);
      continue;
    }

    if (existingTask) {
        // Skip, task exists
        continue;
    }

    console.log(`Creating missing reel task for: ${delivery.delivery_name} (ID: ${delivery.id})`);

    // Calculate deadline
    const [year, month, day] = delivery.date.split('-').map(Number);
    const deadlineDate = new Date(year, month - 1, day, 23, 59, 59);
    if (delivery.received_amount === 700) {
        deadlineDate.setDate(deadlineDate.getDate() + 1);
    }
    const deadline = deadlineDate.toISOString();

    const { error: insertError } = await supabase
        .from('reel_tasks')
        .insert({
            delivery_id: delivery.id,
            assigned_user_id: delivery.assigned_user_id,
            status: 'PENDING',
            deadline: deadline,
        });

    if (insertError) {
        console.error(`❌ Failed to create task for ${delivery.delivery_name}:`, insertError.message);
    } else {
        console.log(`✨ Successfully created reel task for: ${delivery.delivery_name}`);
        createdCount++;
    }
  }

  console.log(`\n--- BACKFILL COMPLETE ---`);
  console.log(`Total missing tasks created: ${createdCount}`);
}

backfill();
