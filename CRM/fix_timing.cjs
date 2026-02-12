
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function run() {
    const logFile = 'fix_timing_log.txt';
    fs.writeFileSync(logFile, '--- FIX TIMING LOG ---\n');
    const log = (msg) => {
        console.log(msg);
        fs.appendFileSync(logFile, (typeof msg === 'object' ? JSON.stringify(msg, null, 2) : msg) + '\n');
    };

    try {
        const envPath = path.join(process.cwd(), '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const env = {};
        envContent.split('\n').forEach(line => {
            const [key, val] = line.split('=');
            if (key && val) env[key.trim()] = val.trim().replace(/"/g, '');
        });

        const url = env.VITE_SUPABASE_URL;
        const key = env.VITE_SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(url, key);

        // Fetch deliveries with missing timing but name looking like it has time
        // Pattern: _HH_MM at the end
        const { data: deliveries, error } = await supabase.from('deliveries')
            .select('*')
            .is('timing', null)
            .not('delivery_name', 'is', null) // redundant but safe
            .like('delivery_name', '%_%_%'); // contain underscores

        if (error) throw error;

        log(`Found ${deliveries.length} candidates.`);

        for (const d of deliveries) {
            // Extract HH_MM from end of string
            // e.g. 07-02-2026_BIMAL_NEXA_21_05
            const match = d.delivery_name.match(/_(\d{2})_(\d{2})$/);
            if (match) {
                const timeStr = `${match[1]}:${match[2]}:00`;
                log(`Fixing ${d.delivery_name} -> ${timeStr}`);

                const { error: updateError } = await supabase
                    .from('deliveries')
                    .update({ timing: timeStr })
                    .eq('id', d.id);

                if (updateError) log('Error updating: ' + updateError.message);
                else log('Fixed.');
            } else {
                // Try strict HH_MM at e.g. _12_00
                // Some might be _12_0
            }
        }

    } catch (e) {
        log('ERROR: ' + e.message);
    }
}

run();
