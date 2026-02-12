
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

        // 1. Get Sahith
        const { data: { users } } = await client.auth.admin.listUsers();
        const sahith = users.find(u => u.email?.includes('sahith'));

        if (!sahith) { log('NO SAHITH'); return; }
        log(`USER: ${sahith.email}`);

        // 2. Get Cluster Code for Sahith
        const { data: maps } = await client.from('mappings').select('*').eq('photographer_id', sahith.id);
        if (!maps.length) { log('NO MAPPING'); return; }

        const { data: cluster } = await client.from('clusters').select('*').eq('id', maps[0].cluster_id).single();
        const sahithClusterName = cluster.name;
        log(`SAHITH CLUSTER: "${sahithClusterName}"`);

        // 3. Get Delivery Cluster Code
        const { data: deliveries } = await client.from('deliveries').select('*').ilike('delivery_name', '%NANDI%').limit(5);

        // Find the 21:50 one specifically if possible, or print all Nandi today
        const target = deliveries.find(d => d.delivery_name.includes('21_50'));

        if (target) {
            log(`DELIVERY: "${target.delivery_name}"`);
            log(`DELIVERY CLUSTER: "${target.cluster_code}"`);

            // CHECK MATCH
            const match = target.cluster_code === sahithClusterName;
            log(`MATCH? ${match} ("${target.cluster_code}" vs "${sahithClusterName}")`);
        } else {
            log('TARGET DELIVERY NOT FOUND. Others:');
            deliveries.forEach(d => log(`- ${d.delivery_name}`));
        }

    } catch (e) {
        log('ERR: ' + e.message);
    }
}

run();
