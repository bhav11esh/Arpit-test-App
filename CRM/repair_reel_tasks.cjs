const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function repair() {
    console.log('--- REEL TASKS REPAIR START ---');

    // 1. Find all DONE deliveries for today (2026-03-10)
    const { data: deliveries, error: dError } = await supabase
        .from('deliveries')
        .select('*')
        .eq('status', 'DONE')
        .eq('date', '2026-03-10');

    if (dError) {
        console.error('Error fetching deliveries:', dError);
        return;
    }

    console.log(`Found ${deliveries.length} DONE deliveries.`);

    for (const delivery of deliveries) {
        // 2. Check if a reel task already exists
        const { data: existingTask, error: tError } = await supabase
            .from('reel_tasks')
            .select('*')
            .eq('delivery_id', delivery.id)
            .maybeSingle();

        if (existingTask) {
            console.log(`✅ Reel task already exists for: ${delivery.delivery_name}`);
            continue;
        }

        console.log(`⏳ Creating missing reel task for: ${delivery.delivery_name}`);

        // same logic as HomeScreen.tsx
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
        }
    }

    console.log('--- REPAIR COMPLETE ---');
}

repair();
