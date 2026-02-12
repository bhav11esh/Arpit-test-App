
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function run() {
    const log = (msg) => console.log(msg);
    const err = (msg) => console.error(msg);

    try {
        const envPath = path.join(process.cwd(), '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const env = {};
        envContent.split('\n').forEach(line => {
            const [key, val] = line.split('=');
            if (key && val) env[key.trim()] = val.trim().replace(/"/g, '');
        });

        const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY);

        // 1. Find Sahith via Auth Admin
        const { data: { users }, error: uError } = await client.auth.admin.listUsers();
        if (uError) {
            err('AUTH ERROR: ' + uError.message);
            return;
        }

        const sahith = users.find(u => u.email?.toLowerCase().includes('sahith') || u.user_metadata?.name?.toLowerCase().includes('sahith'));

        if (sahith) {
            log(`\nFOUND SAHITH: ${sahith.email} (${sahith.id})`);

            // 2. Check Mapping
            const { data: maps, error: mError } = await client.from('mappings').select('*').eq('photographer_id', sahith.id);
            if (mError) {
                err('MAPPING FETCH ERROR: ' + mError.message);
            } else if (maps.length) {
                const m = maps[0];
                const { data: cluster } = await client.from('clusters').select('*').eq('id', m.cluster_id).single();
                log(`MAPPING: Cluster=${cluster ? cluster.name : 'Unknown'} (ID: ${m.cluster_id})`);
                // We need the CODE not just name.
                // In config.ts, cluster has name. Code might be derived or same as name?
                // HomeScreen uses: const effectiveClusterCode = cluster?.name || '';
                log(`CLUSTER CODE BEING USED: ${cluster ? cluster.name : 'UNK'}`);
            } else {
                log('NO MAPPING FOUND FOR SAHITH');
            }

        } else {
            log('USER SAHITH NOT FOUND IN AUTH');
            log('Available users: ' + users.map(u => u.email).join(', '));
        }

        // 3. Check Nandi Delivery Cluster
        const today = new Date().toISOString().split('T')[0];
        const { data: deliveries } = await client.from('deliveries').select('*').ilike('delivery_name', '%NANDI_TOYOTA_21_50%');
        if (deliveries && deliveries.length) {
            const d = deliveries[0];
            log(`\nDELIVERY: ${d.delivery_name}`);
            log(`Cluster Code: ${d.cluster_code}`);
            log(`Status: ${d.status}`);
        } else {
            log('\nDELIVERY NOT FOUND');
        }

    } catch (e) {
        err('Script Exception: ' + e.message);
    }
}

run();
