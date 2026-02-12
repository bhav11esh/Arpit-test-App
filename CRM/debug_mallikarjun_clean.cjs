
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
        const { data: deliveries } = await client.from('deliveries')
            .select('*')
            .eq('date', today)
            .ilike('delivery_name', '%BIMAL%22_20%');

        if (deliveries && deliveries.length) {
            const d = deliveries[0];
            log(JSON.stringify({
                name: d.delivery_name,
                status: d.status,
                timing: d.timing,
                cluster: d.cluster_code,
                type: d.showroom_type,
                assigned_to: d.assigned_user_id
            }, null, 2));
        } else {
            log('NOT FOUND');
        }

    } catch (e) {
        log('ERR: ' + e.message);
    }
}

run();
