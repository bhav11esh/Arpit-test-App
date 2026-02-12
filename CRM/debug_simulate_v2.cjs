
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

        // 1. Get Mallikarjun by strict name check
        const { data: { users } } = await client.auth.admin.listUsers();

        // Log all matches for 'mallik' to see who is who
        const matches = users.filter(u => u.email?.toLowerCase().includes('mallik') || u.user_metadata?.name?.toLowerCase().includes('mallik'));
        log(`FOUND ${matches.length} matches for 'mallik':`);
        matches.forEach(u => log(`- ${u.email} (${u.user_metadata?.name})`));

        // Pick specific one
        const user = matches.find(u => u.user_metadata?.name === 'Mallikarjun' || u.email?.includes('mallikarjun'));

        if (!user) { log('TARGET USER NOT FOUND'); return; }
        log(`\nTARGETING: ${user.email} (${user.id})`);

        // 2. Get User Cluster
        const { data: maps } = await client.from('mappings').select('*').eq('photographer_id', user.id);
        const { data: cluster } = maps.length ? await client.from('clusters').select('name').eq('id', maps[0].cluster_id).single() : { data: null };
        log(`USER CLUSTER: "${cluster ? cluster.name : 'NONE'}"`);

        // 3. Get Delivery 22:20
        const today = '2026-02-07';
        const { data: deliveries } = await client.from('deliveries')
            .select('*')
            .eq('date', today)
            .ilike('delivery_name', '%BIMAL%22_20%');

        if (deliveries && deliveries.length) {
            const d = deliveries[0];
            log('\nDELIVERY RAW:');
            log(JSON.stringify(d, null, 2));

            if (!d.timing) {
                log('!!! TIMING IS NULL !!!');
            } else {
                log(`TIMING VALID: ${d.timing}`);

                // SIMULATE
                const dCluster = d.cluster_code || '';
                const uCluster = cluster ? cluster.name : '';
                const match = dCluster.trim() === uCluster.trim();
                log(`CLUSTER MATCH? ${match} ("${dCluster}" vs "${uCluster}")`);

                const isUnassigned = d.status === 'UNASSIGNED';
                log(`IS UNASSIGNED? ${isUnassigned}`);

                // Time Window check
                // Parse delivery date and timing
                const [year, month, day] = d.date.split('-').map(Number);
                const [hours, minutes] = d.timing.split(':').map(Number);
                const deliveryTime = new Date(year, month - 1, day, hours, minutes);
                const thirtyMinsBefore = new Date(deliveryTime.getTime() - 30 * 60 * 1000);

                // Assume "now" is 22:15 (middle of window)
                const mockNow = new Date(deliveryTime.getTime() - 5 * 60 * 1000); // T-5 mins
                const inWindow = mockNow >= thirtyMinsBefore && mockNow < deliveryTime;
                log(`WINDOW CHECK (at T-5): ${inWindow}`);
            }

        } else {
            log('DELIVERY NOT FOUND');
        }

    } catch (e) {
        log('ERR: ' + e.message);
    }
}

run();
