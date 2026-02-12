
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

        // 1. Get Mallikarjun
        const { data: { users } } = await client.auth.admin.listUsers();
        const user = users.find(u => u.user_metadata?.name?.toLowerCase().includes('mallik'));

        if (!user) { log('NO MALLIKARJUN'); return; }
        log(`U: ${user.user_metadata.name} ID:${user.id}`);

        // 2. Get User Cluster
        const { data: maps } = await client.from('mappings').select('*').eq('photographer_id', user.id);
        const { data: cluster } = maps.length ? await client.from('clusters').select('name').eq('id', maps[0].cluster_id).single() : { data: null };
        log(`UC: "${cluster ? cluster.name : 'NONE'}"`);

        // 3. Get Delivery
        const today = '2026-02-07';
        const { data: deliveries } = await client.from('deliveries')
            .select('delivery_name, cluster_code, status, timing, showroom_type')
            .eq('date', today)
            .ilike('delivery_name', '%BIMAL%22_20%');

        if (deliveries && deliveries.length) {
            const d = deliveries[0];
            log(`D: ${d.delivery_name}`);
            log(`S: ${d.status}`);
            log(`T: ${d.timing}`);
            log(`DC: "${d.cluster_code}"`);
            log(`ST: ${d.showroom_type}`);

            // 4. Rejections
            const { data: rejections } = await client.from('delivery_rejections')
                .select('*')
                .eq('delivery_id', deliveries[0].id) // Use ID from fetched
                .eq('user_id', user.id);

            log(`R: ${rejections?.length || 0}`);

            // LOGIC CHECK
            const match = d.cluster_code.trim() === cluster.name.trim();
            log(`MATCH: ${match}`);

        } else {
            log('DELIVERY NOT FOUND');
        }

    } catch (e) {
        log('ERR: ' + e.message);
    }
}

run();
