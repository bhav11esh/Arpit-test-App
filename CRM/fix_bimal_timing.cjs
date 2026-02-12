
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function run() {
    const log = (msg) => console.log(msg);

    try {
        const envPath = path.join(process.cwd(), '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const env = {};
        envContent.split('\n').forEach(line => {
            const lineSplit = line.split('=');
            if (lineSplit.length > 1) {
                env[lineSplit[0].trim()] = lineSplit.slice(1).join('=').trim().replace(/"/g, '');
            }
        });

        const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY);

        const today = '2026-02-07';
        // Find the delivery
        const { data: deliveries } = await client.from('deliveries')
            .select('*')
            .eq('date', today)
            .ilike('delivery_name', '%BIMAL%22_20%');

        if (!deliveries || !deliveries.length) {
            log('DELIVERY NOT FOUND');
            return;
        }

        const d = deliveries[0];
        log(`FOUND: ${d.delivery_name} (ID: ${d.id})`);
        log(`Current Timing: ${d.timing}`);

        if (!d.timing) {
            log('Updating timing to 22:20...');
            const { error } = await client.from('deliveries')
                .update({ timing: '22:20' })
                .eq('id', d.id);

            if (error) {
                log('UPDATE FAILED: ' + error.message);
            } else {
                log('UPDATE SUCCESSFUL');
            }
        } else {
            log('Timing is already set.');
        }

    } catch (e) {
        log('ERR: ' + e.message);
    }
}

run();
