
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

        // 1. Get Delivery
        const today = '2026-02-07';
        const { data: deliveries } = await client.from('deliveries')
            .select('*')
            .eq('date', today)
            .ilike('delivery_name', '%BIMAL%22_20%');

        if (!deliveries || !deliveries.length) {
            log('DELIVERY NOT FOUND');
            return;
        }
        const delivery = deliveries[0];

        // 2. Get Users in Cluster
        const { data: cluster } = await client.from('clusters').select('id').eq('name', delivery.cluster_code).single();
        if (!cluster) { log('CLUSTER NOT FOUND IN DB'); return; }

        const { data: mappings } = await client.from('mappings').select('photographer_id').eq('cluster_id', cluster.id);
        const clusterUserIds = mappings.map(m => m.photographer_id);

        // 3. Get Rejections
        const { data: rejections } = await client.from('delivery_rejections').select('user_id').eq('delivery_id', delivery.id);
        const rejectedUserIds = new Set(rejections.map(r => r.user_id));

        // 4. Find Eligible Users
        const eligibleIds = clusterUserIds.filter(id => !rejectedUserIds.has(id));

        log(`\nELIGIBLE USERS LEFT (${eligibleIds.length}):`);
        const { data: { users } } = await client.auth.admin.listUsers();

        eligibleIds.forEach(id => {
            const u = users.find(user => user.id === id);
            if (u) {
                log(`- ${u.email} (${u.user_metadata?.name || 'No Name'}) [ID: ${id}]`);
            } else {
                log(`- UNKNOWN USER (Deleted?) [ID: ${id}]`);
            }
        });

    } catch (e) {
        log('ERR: ' + e.message);
    }
}

run();
