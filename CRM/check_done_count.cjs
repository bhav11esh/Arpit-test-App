const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
    console.log('--- DONE DELIVERIES CHECK ---');

    const dates = ['2026-03-10', '2026-03-11'];

    for (const date of dates) {
        const { data, error } = await supabase
            .from('deliveries')
            .select('id, delivery_name, status, assigned_user_id, date')
            .eq('status', 'DONE')
            .eq('date', date);

        if (error) {
            console.error(`Error for ${date}:`, error);
        } else {
            console.log(`\nFound ${data.length} DONE deliveries for ${date}:`);
            data.forEach(d => {
                console.log(`- ${d.delivery_name} (Assigned to: ${d.assigned_user_id})`);
            });
        }
    }
}

check();
