
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
            const [key, val] = line.split('=');
            if (key && val) env[key.trim()] = val.trim().replace(/"/g, '');
        });

        const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY);

        // 1. Get ALL Deliveries for today (to find Nandi)
        const today = new Date().toISOString().split('T')[0];
        const { data: deliveries, error: dError } = await client
            .from('deliveries')
            .select('id, delivery_name, cluster_code, status, timing, showroom_type')
            .eq('date', today);

        if (dError) {
            log('Error fetching deliveries: ' + dError.message);
        } else {
            log(`\n--- DELIVERIES TODAY (${deliveries.length}) ---`);
            const nandi = deliveries.find(d => d.delivery_name.includes('NANDI'));
            if (nandi) {
                log('FOUND NANDI: ' + JSON.stringify(nandi, null, 2));
            } else {
                log('NO NANDI DELIVERY FOUND. Listing all names:');
                deliveries.forEach(d => log(`- ${d.delivery_name} [${d.status}]`));
            }
        }

        // 2. Get Users and Mappings
        log('\n--- PROFILES & MAPPINGS ---');

        const { data: profiles, error: pError } = await client.from('profiles').select('*');
        if (pError) log('Profiles Error: ' + pError.message);

        const { data: mappings, error: mError } = await client.from('mappings').select('*');
        if (mError) log('Mappings Error: ' + mError.message);

        if (profiles && mappings) {
            profiles.forEach(p => {
                const mapping = mappings.find(m => m.photographer_id === p.id);
                const cluster = mapping ? mapping.cluster_id : 'NO MAPPING'; // mappings usually have cluster_id (UUID) not code?
                // Wait, HomeScreen uses mapping.cluster_code?
                // HomeScreen: const mapping = mappings.find...
                // HomeScreen joins? No, it uses context.
                // Let's check what fields 'mappings' table has.

                // Highlight Sahith
                const isSahith = p.name?.toLowerCase().includes('sahith') || p.email?.toLowerCase().includes('sahith');
                const prefix = isSahith ? '>>> ' : '    ';

                log(`${prefix}${p.name} (${p.email}) - Role: ${p.role}`);
                if (isSahith && mapping) {
                    log(`    Mapping: ${JSON.stringify(mapping)}`);
                }
            });
        }

        // 3. Check Clusters Table to map ID to Code
        if (mappings && mappings.length > 0) {
            const clusterId = mappings[0].cluster_id;
            if (clusterId) {
                const { data: cluster } = await client.from('clusters').select('*').eq('id', clusterId).single();
                if (cluster) log(`\nSample Cluster: ${cluster.id} -> ${cluster.name} (Code?)`);
            }
        }

    } catch (e) {
        log('Script Error: ' + e.message);
    }
}

run();
