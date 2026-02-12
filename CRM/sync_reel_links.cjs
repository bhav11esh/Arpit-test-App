const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envVars[key.trim()] = value.trim();
    }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseServiceKey = envVars.VITE_SUPABASE_SERVICE_ROLE_KEY;
const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncReelLinks() {
    console.log('--- Syncing Reel Links from Tasks to Deliveries ---');

    // 1. Get all RESOLVED reel tasks
    const { data: resolvedTasks, error: tasksError } = await adminSupabase
        .from('reel_tasks')
        .select('*')
        .eq('status', 'RESOLVED');

    if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        return;
    }

    console.log(`Found ${resolvedTasks.length} resolved reel tasks.`);

    let updatedCount = 0;

    for (const task of resolvedTasks) {
        if (!task.reel_link || !task.delivery_id) continue;

        // 2. Get the delivery
        const { data: delivery, error: deliveryError } = await adminSupabase
            .from('deliveries')
            .select('id, reel_link, delivery_name')
            .eq('id', task.delivery_id)
            .single();

        if (deliveryError) {
            console.error(`Error fetching delivery ${task.delivery_id}:`, deliveryError.message);
            continue;
        }

        // 3. Check if sync is needed
        if (delivery.reel_link !== task.reel_link) {
            console.log(`Mismatch found for ${delivery.delivery_name || task.delivery_id}:`);
            console.log(`  Task Link: ${task.reel_link}`);
            console.log(`  Deli Link: ${delivery.reel_link || '(empty)'}`);

            // 4. Update delivery
            const { error: updateError } = await adminSupabase
                .from('deliveries')
                .update({ reel_link: task.reel_link })
                .eq('id', task.delivery_id);

            if (updateError) {
                console.error('  Failed to update delivery:', updateError.message);
            } else {
                console.log('  ✅ Synced successfully');
                updatedCount++;
            }
        }
    }

    console.log(`--- Sync Complete. Updated ${updatedCount} deliveries. ---`);
}

syncReelLinks();
